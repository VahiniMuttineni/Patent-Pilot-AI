from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class MoleculeMetadata(BaseModel):
    """
    Metadata computed for a valid molecule.
    """
    canonical_smiles: str
    compound_name: Optional[str] = None
    molecular_formula: str
    molecular_weight: float
    num_atoms: int
    num_bonds: int
    heavy_atom_count: int
    ring_count: int
    logp: Optional[float] = None
    tpsa: Optional[float] = None
    num_hbd: Optional[int] = None
    num_hba: Optional[int] = None
    num_rotatable_bonds: Optional[int] = None
    lipinski_violations: Optional[int] = None
    lipinski_compliant: Optional[bool] = None
    pharmacophore_features: List[str] = []
    
    model_config = ConfigDict(from_attributes=True, extra="allow")

