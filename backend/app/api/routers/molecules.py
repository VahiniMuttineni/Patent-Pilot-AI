from fastapi import APIRouter, Query, Response
from typing import Optional
import logging
from rdkit import Chem
from rdkit.Chem import AllChem, rdFMCS
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit.DataStructs import TanimotoSimilarity

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/molecules", tags=["Molecules"])

@router.get("/render-svg")
async def render_molecule_svg(
    smiles: str = Query(..., description="SMILES string to render"),
    highlight: Optional[str] = Query(None, description="Substructure SMILES to highlight inside the main structure"),
    width: int = Query(320, ge=10, le=1000),
    height: int = Query(220, ge=10, le=1000),
    theme: str = Query("dark", description="Color theme: 'dark' or 'light'")
):
    """
    Render a 2D chemical structure directly from SMILES as a clean SVG image using RDKit.
    If 'highlight' is provided, performs substructure matching and highlights matching atoms/bonds.
    Supports both 'dark' and 'light' color themes optimized for the modern UI.
    """
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return Response(content=_generate_placeholder_svg(width, height, "Invalid SMILES", theme), media_type="image/svg+xml")
            
        highlight_atoms = ()
        if highlight:
            sub_mol = Chem.MolFromSmiles(highlight)
            if sub_mol and mol.HasSubstructMatch(sub_mol):
                highlight_atoms = mol.GetSubstructMatch(sub_mol) or ()
                
        drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
        opts = drawer.drawOptions()
        opts.addAtomIndices = False
        opts.clearBackground = False  # Transparent background so it blends smoothly with cards
        opts.bondLineWidth = 2
        opts.padding = 0.06
        
        if theme.lower() == "dark":
            # High-contrast color palette optimized specifically for dark backgrounds (#14171f / #0f172a)
            opts.updateAtomPalette({
                -1: (0.95, 0.95, 0.98), # Default
                6: (0.92, 0.95, 1.0),   # Carbon & standard bonds -> bright crisp white/light-cyan
                7: (0.35, 0.72, 1.0),   # Nitrogen -> bright sky blue
                8: (1.0, 0.42, 0.42),   # Oxygen -> bright coral red
                9: (0.40, 0.95, 0.65),  # Fluorine -> bright mint green
                16: (1.0, 0.85, 0.28),  # Sulfur -> bright amber gold
                17: (0.42, 0.92, 0.42), # Chlorine -> bright neon green
                35: (0.95, 0.60, 0.35)  # Bromine -> bright orange
            })
            if highlight_atoms:
                # Vivid neon cyan highlight for high visibility
                opts.setHighlightColour((0.0, 0.88, 0.88, 0.65))
        else:
            if highlight_atoms:
                opts.setHighlightColour((1.0, 0.8, 0.2, 0.6))
                
        drawer.DrawMolecule(mol, highlightAtoms=highlight_atoms)
        drawer.FinishDrawing()
        
        svg_text = drawer.GetDrawingText()
        return Response(content=svg_text, media_type="image/svg+xml")
    except Exception as e:
        logger.error(f"Error rendering SVG for {smiles}: {e}")
        return Response(content=_generate_placeholder_svg(width, height, "Structure Unavailable", theme), media_type="image/svg+xml")

def _generate_placeholder_svg(width: int, height: int, message: str, theme: str) -> str:
    bg_color = "#111318" if theme.lower() == "dark" else "#f8f9fa"
    text_color = "#7d8590" if theme.lower() == "dark" else "#64748b"
    border_color = "#2a2e39" if theme.lower() == "dark" else "#e2e8f0"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
      <rect width="100%" height="100%" fill="{bg_color}" rx="8" stroke="{border_color}" stroke-dasharray="4 4" />
      <text x="50%" y="50%" fill="{text_color}" font-family="system-ui, -apple-system, monospace" font-size="12" font-weight="500" text-anchor="middle" dy=".3em">{message}</text>
    </svg>'''

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

@router.get("/compare")
async def compare_molecules(
    query_smiles: str = Query(..., description="SMILES of query molecule"),
    target_smiles: Optional[str] = Query(None, description="SMILES of target/patent molecule (defaults to query if empty)")
):
    """
    Compute exact Maximum Common Substructure (MCS), Morgan Tanimoto similarity,
    and matched/unmatched pharmacophore features between query and target SMILES.
    """
    if not target_smiles or target_smiles.strip() == "":
        target_smiles = query_smiles

    q_mol = Chem.MolFromSmiles(query_smiles)
    t_mol = Chem.MolFromSmiles(target_smiles)

    if not q_mol or not t_mol:
        return {
            "success": True,
            "data": {
                "query_smiles": query_smiles,
                "target_smiles": target_smiles,
                "tanimoto_similarity": 0.0,
                "mcs_coverage_pct": 0.0,
                "matched_atoms": 0,
                "total_query_atoms": q_mol.GetNumHeavyAtoms() if q_mol else 0,
                "total_target_atoms": t_mol.GetNumHeavyAtoms() if t_mol else 0,
                "matched_features": [],
                "unmatched_features": []
            }
        }

    # Fingerprint similarity
    fp1 = AllChem.GetMorganFingerprintAsBitVect(q_mol, 2, nBits=2048)
    fp2 = AllChem.GetMorganFingerprintAsBitVect(t_mol, 2, nBits=2048)
    tanimoto = round(TanimotoSimilarity(fp1, fp2), 3)

    # MCS
    mcs_res = rdFMCS.FindMCS([q_mol, t_mol])
    q_heavy = q_mol.GetNumHeavyAtoms()
    t_heavy = t_mol.GetNumHeavyAtoms()
    mcs_cov = round((mcs_res.numAtoms / max(1, q_heavy)) * 100.0, 1) if q_heavy > 0 else 0.0

    # Pharmacophore matching
    matched_features = []
    unmatched_features = []
    for name, smarts in COMMON_PHARMACOPHORES.items():
        pat = Chem.MolFromSmarts(smarts)
        if pat:
            q_has = q_mol.HasSubstructMatch(pat)
            t_has = t_mol.HasSubstructMatch(pat)
            if q_has and t_has:
                matched_features.append(name)
            elif q_has and not t_has:
                unmatched_features.append(name)

    return {
        "success": True,
        "data": {
            "query_smiles": query_smiles,
            "target_smiles": target_smiles,
            "tanimoto_similarity": tanimoto,
            "mcs_smarts": mcs_res.smartsString,
            "matched_atoms": mcs_res.numAtoms,
            "matched_bonds": mcs_res.numBonds,
            "total_query_atoms": q_heavy,
            "total_target_atoms": t_heavy,
            "mcs_coverage_pct": mcs_cov,
            "matched_features": matched_features,
            "unmatched_features": unmatched_features
        }
    }

