import logging
from functools import lru_cache
from typing import Dict, Any, Callable, Optional, List
import httpx
import urllib.parse
from rdkit import Chem
from rdkit.Chem import Descriptors
from rdkit.Chem import rdMolDescriptors
from rdkit.DataStructs.cDataStructs import TanimotoSimilarity

from app.schemas.molecule import MoleculeMetadata

logger = logging.getLogger(__name__)

@lru_cache(maxsize=1024)
def _cached_mol_from_smiles(smiles: str):
    if not smiles or not isinstance(smiles, str):
        return None
    return Chem.MolFromSmiles(smiles)

@lru_cache(maxsize=1024)
def _cached_fingerprint_from_smiles(smiles: str):
    mol = _cached_mol_from_smiles(smiles)
    if mol is None:
        return None
    return rdMolDescriptors.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048)

COMMON_PHARMACOPHORES = {
    "Aromatic benzene ring scaffold": "c1ccccc1",
    "Ester group (acetoxy linkage)": "C(=O)O[C,c]",
    "Carboxylic acid functional group": "C(=O)[OH]",
    "Ortho-disubstituted aromatic pattern": "c1(C)c(O)cccc1",
    "Amide / Peptide linkage": "C(=O)N",
    "Pyridine heteroaromatic ring": "c1ncccc1",
    "Aliphatic hydroxyl group": "[C][OX2H]",
    "Phenolic hydroxyl group": "[c][OX2H]",
    "Primary / Secondary amine": "[NX3;H2,H1;!$(NC=O)]",
    "Halogen substitution (F/Cl/Br/I)": "[c,C][F,Cl,Br,I]"
}

COMMON_DRUG_NAMES = {
    "CC(=O)Oc1ccccc1C(=O)O": "Aspirin (Acetylsalicylic Acid)",
    "CC(=O)OC1=CC=CC=C1C(=O)O": "Aspirin (Acetylsalicylic Acid)",
    "CC(C)Cc1ccc(C(C)C(=O)O)cc1": "Ibuprofen",
    "CC(=O)Nc1ccc(O)cc1": "Acetaminophen (Paracetamol)",
    "CN1C=NC2=C1C(=O)N(C(=O)N2C)C": "Caffeine",
    "Cc1ccc(NC(=O)c2ccc(CN3CCN(C)CC3)cc2)cc1Nc1nccc(n1)c1cccnc1": "Imatinib",
    "CC(C)(C)NCC(O)c1ccc(O)c(CO)c1": "Salbutamol (Albuterol)",
    "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C": "Testosterone",
    "C(C(=O)O)C(CC(=O)O)(C(=O)O)O": "Citric acid",
    "c1ccccc1": "Benzene",
    "Cc1ccccc1": "Toluene",
    "Oc1ccccc1": "Phenol",
    "O=C(O)c1ccccc1": "Benzoic acid",
    "O=C(O)c1ccccc1O": "Salicylic acid",
    "CN(C)C(=N)NC(=N)N": "Metformin",
    "CC1(C(N2C(S1)C(C2=O)NC(=O)C(c3ccccc3)N)C(=O)O)C": "Ampicillin",
    "CC1(C(N2C(S1)C(C2=O)NC(=O)C(c3ccccc3)O)C(=O)O)C": "Amoxicillin",
    "COc1ccc2ncc(C(=O)Nc3cc(OC)c(OC)c(OC)c3)n2c1": "Trimethoprim",
    "O=C(O)Cc1ccccc1Nc1ccccc1Cl": "Diclofenac",
}

class MoleculeError(Exception):
    """Base exception for molecule processing errors."""
    pass

class InvalidSMILESError(MoleculeError):
    """Raised when a SMILES string cannot be parsed."""
    pass

class MoleculeService:

    """
    A service for performing chemistry-related operations using RDKit.
    Designed to be reusable, independent of FastAPI, and easily extensible.
    """
    
    def __init__(self):
        # Register additional custom descriptors here if needed in the future
        self._custom_descriptors: Dict[str, Callable[[Chem.Mol], Any]] = {}

    def register_descriptor(self, name: str, func: Callable[[Chem.Mol], Any]) -> None:
        """
        Register a custom descriptor function that takes an RDKit Mol object and returns a value.
        """
        self._custom_descriptors[name] = func

    def parse_smiles(self, smiles: str) -> Chem.Mol:
        """
        Parse a SMILES string into an RDKit Mol object.
        
        Args:
            smiles: The SMILES string to parse.
            
        Returns:
            An RDKit Mol object.
            
        Raises:
            InvalidSMILESError: If the SMILES string is invalid or cannot be parsed.
        """
        if not smiles or not isinstance(smiles, str):
            raise InvalidSMILESError("SMILES must be a non-empty string.")
            
        mol = _cached_mol_from_smiles(smiles)
        if mol is None:
            raise InvalidSMILESError(f"Invalid SMILES string: {smiles}")
            
        return mol

    def get_canonical_smiles(self, mol: Chem.Mol) -> str:
        """
        Generate the canonical SMILES string for a molecule.
        
        Args:
            mol: RDKit Mol object.
            
        Returns:
            Canonical SMILES string.
        """
        return Chem.MolToSmiles(mol, canonical=True)

    def extract_metadata(self, smiles: str, compound_name: Optional[str] = None) -> MoleculeMetadata:
        """
        Parse SMILES and extract standard molecular metadata including any registered custom descriptors.
        
        Args:
            smiles: The SMILES string to process.
            compound_name: Optional resolved compound name.
            
        Returns:
            MoleculeMetadata containing descriptors.
        """
        mol = self.parse_smiles(smiles)
        
        # Calculate standard descriptors
        canonical_smiles = self.get_canonical_smiles(mol)
        formula = rdMolDescriptors.CalcMolFormula(mol)
        mw = Descriptors.MolWt(mol)
        num_atoms = Chem.AddHs(mol).GetNumAtoms()
        num_bonds = mol.GetNumBonds()
        heavy_atoms = mol.GetNumHeavyAtoms()
        ring_count = rdMolDescriptors.CalcNumRings(mol)
        
        try:
            logp = Descriptors.MolLogP(mol)
        except Exception as e:
            logger.warning(f"Could not calculate LogP for {smiles}: {e}")
            logp = None
            
        try:
            tpsa = Descriptors.TPSA(mol)
        except Exception as e:
            logger.warning(f"Could not calculate TPSA for {smiles}: {e}")
            tpsa = None
            
        try:
            num_hbd = rdMolDescriptors.CalcNumHBD(mol)
        except Exception:
            num_hbd = 0
        try:
            num_hba = rdMolDescriptors.CalcNumHBA(mol)
        except Exception:
            num_hba = 0
        try:
            num_rotatable_bonds = rdMolDescriptors.CalcNumRotatableBonds(mol)
        except Exception:
            num_rotatable_bonds = 0

        lipinski_violations = 0
        if mw > 500: lipinski_violations += 1
        if logp is not None and logp > 5: lipinski_violations += 1
        if num_hbd > 5: lipinski_violations += 1
        if num_hba > 10: lipinski_violations += 1
        lipinski_compliant = (lipinski_violations <= 1)

        pharmacophore_features = []
        for name, smarts in COMMON_PHARMACOPHORES.items():
            pat = Chem.MolFromSmarts(smarts)
            if pat and mol.HasSubstructMatch(pat):
                pharmacophore_features.append(name)

        # Initialize dictionary with base fields
        data = {
            "canonical_smiles": canonical_smiles,
            "compound_name": compound_name,
            "molecular_formula": formula,
            "molecular_weight": round(mw, 2),
            "num_atoms": num_atoms,
            "num_bonds": num_bonds,
            "heavy_atom_count": heavy_atoms,
            "ring_count": ring_count,
            "logp": round(logp, 2) if logp is not None else None,
            "tpsa": round(tpsa, 2) if tpsa is not None else None,
            "num_hbd": num_hbd,
            "num_hba": num_hba,
            "num_rotatable_bonds": num_rotatable_bonds,
            "lipinski_violations": lipinski_violations,
            "lipinski_compliant": lipinski_compliant,
            "pharmacophore_features": pharmacophore_features
        }
        
        # Calculate and merge custom descriptors
        for name, func in self._custom_descriptors.items():
            try:
                data[name] = func(mol)
            except Exception as e:
                logger.warning(f"Could not calculate custom descriptor {name} for {smiles}: {e}")
                data[name] = None
                
        # For this specific output, we ensure we return the standardized model
        return MoleculeMetadata(**data)

    async def resolve_compound_name(self, canonical_smiles: str, fallback_target: Optional[str] = None) -> str:
        """
        Resolve the compound name via local dictionary, PubChem PUG REST API, or formula fallback.
        """
        # 1. Check local dictionary
        if canonical_smiles in COMMON_DRUG_NAMES:
            return COMMON_DRUG_NAMES[canonical_smiles]
            
        for smiles_key, name in COMMON_DRUG_NAMES.items():
            if smiles_key == canonical_smiles:
                return name
                
        # 2. Check if user provided a meaningful target that looks like a name (e.g., not just 'cancer')
        if fallback_target and len(fallback_target.strip()) > 2 and fallback_target.strip().lower() not in ["cancer", "oncology", "diabetes", "pain", "inflammation", "kinase", "inhibitor"]:
            # If it's explicitly a drug name entered by user, prefer or combine
            pass
                
        # 3. Query PubChem PUG REST API
        try:
            url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/{urllib.parse.quote(canonical_smiles)}/property/Title,IUPACName/JSON"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    props = data.get("PropertyTable", {}).get("Properties", [])
                    if props:
                        title = props[0].get("Title") or props[0].get("IUPACName")
                        cid = props[0].get("CID")
                        if title:
                            if cid and str(title) != f"CID {cid}":
                                return f"{title} (CID {cid})"
                            return title
        except Exception as e:
            logger.debug(f"PubChem name resolution failed for {canonical_smiles}: {e}")
            
        if fallback_target and len(fallback_target.strip()) > 2:
            return fallback_target.strip()
            
        # 4. Fallback to Formula + major chemical class
        try:
            mol = self.parse_smiles(canonical_smiles)
            formula = rdMolDescriptors.CalcMolFormula(mol)
            features = []
            for name, smarts in COMMON_PHARMACOPHORES.items():
                pat = Chem.MolFromSmarts(smarts)
                if pat and mol.HasSubstructMatch(pat):
                    features.append(name.split(" ")[0])
            if features:
                return f"{formula} ({', '.join(features[:2])})"
            return f"Compound ({formula})"
        except Exception:
            return f"Compound ({canonical_smiles[:12]}...)"

    def compute_fingerprint(self, mol: Chem.Mol):
        """
        Compute the Morgan fingerprint (radius 2, 2048 bits) for a molecule.
        
        Args:
            mol: RDKit Mol object.
            
        Returns:
            RDKit explicit bit vector.
        """
        # Morgan fingerprint (ECFP4 equivalent)
        return rdMolDescriptors.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048)
        
    def compute_fingerprint_from_smiles(self, smiles: str):
        """
        Parse SMILES and compute the Morgan fingerprint using LRU cache.
        
        Args:
            smiles: The SMILES string.
            
        Returns:
            RDKit explicit bit vector.
        """
        if not smiles or not isinstance(smiles, str):
            raise InvalidSMILESError("SMILES must be a non-empty string.")
            
        fp = _cached_fingerprint_from_smiles(smiles)
        if fp is None:
            raise InvalidSMILESError(f"Invalid SMILES string for fingerprinting: {smiles}")
        return fp

    def calculate_similarity(self, fp1, fp2) -> float:
        """
        Calculate Tanimoto similarity between two RDKit fingerprints.
        
        Args:
            fp1: First RDKit fingerprint.
            fp2: Second RDKit fingerprint.
            
        Returns:
            Similarity score between 0.0 and 1.0.
        """
        return TanimotoSimilarity(fp1, fp2)

    def calculate_similarity_from_smiles(self, smiles1: str, smiles2: str) -> float:
        """
        Calculate Tanimoto similarity between two SMILES strings directly.
        
        Args:
            smiles1: First SMILES string.
            smiles2: Second SMILES string.
            
        Returns:
            Similarity score between 0.0 and 1.0.
        """
        fp1 = self.compute_fingerprint_from_smiles(smiles1)
        fp2 = self.compute_fingerprint_from_smiles(smiles2)
        return self.calculate_similarity(fp1, fp2)
