import pytest
from rdkit import Chem
from app.services.molecule_service import MoleculeService, InvalidSMILESError
from app.api.routers.molecules import compare_molecules, render_molecule_svg


@pytest.fixture
def molecule_service():
    return MoleculeService()


class TestBenchmark10PharmaceuticalCompounds:
    """
    Enterprise SQA Chemical Validation for 10 Known Reference Molecules.
    Verifies exact formula calculation, molecular weight (+/- 0.15 Da), Lipinski rule compliance,
    and Morgan fingerprint generation (2048-bit radius 2).
    """

    @pytest.mark.parametrize("name,smiles,expected_formula,approx_mw,expected_rings,expected_heavy_atoms", [
        ("Aspirin", "CC(=O)Oc1ccccc1C(=O)O", "C9H8O4", 180.16, 1, 13),
        ("Paracetamol", "CC(=O)Nc1ccc(O)cc1", "C8H9NO2", 151.16, 1, 11),
        ("Ibuprofen", "CC(C)Cc1ccc(C(C)C(=O)O)cc1", "C13H18O2", 206.28, 1, 15),
        ("Caffeine", "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", "C8H10N4O2", 194.19, 2, 14),
        ("Morphine", "CN1CCC23C4C1CC5=C2C(=C(C=C5)O)OC3C(C=C4)O", "C17H19NO3", 285.34, 5, 21),
        ("Nicotine", "CN1CCCC1c2cccnc2", "C10H14N2", 162.23, 2, 12),
        ("Glucose", "OCC1OC(O)C(O)C(O)C1O", "C6H12O6", 180.16, 1, 12),
        ("Benzene", "c1ccccc1", "C6H6", 78.11, 1, 6),
        ("Ethanol", "CCO", "C2H6O", 46.07, 0, 3),
        ("Acetic Acid", "CC(=O)O", "C2H4O2", 60.05, 0, 4)
    ])
    def test_known_benchmark_molecules(self, molecule_service, name, smiles, expected_formula, approx_mw, expected_rings, expected_heavy_atoms):
        meta = molecule_service.extract_metadata(smiles, compound_name=name)
        
        # Verify Formula and Atoms
        assert meta.molecular_formula == expected_formula, f"Formula mismatch for {name}"
        assert abs(meta.molecular_weight - approx_mw) < 0.15, f"MW drift for {name}: {meta.molecular_weight} vs {approx_mw}"
        assert meta.ring_count == expected_rings, f"Ring count mismatch for {name}"
        assert meta.heavy_atom_count == expected_heavy_atoms, f"Heavy atom mismatch for {name}"
        
        # Verify Lipinski compliance (all 10 benchmark molecules should pass Lipinski rule of 5)
        assert meta.lipinski_compliant is True, f"{name} should be Lipinski compliant"
        
        # Verify Morgan fingerprint bit vector
        fp = molecule_service.compute_fingerprint_from_smiles(smiles)
        assert fp is not None
        assert len(fp) == 2048


class TestChemicalEdgeCasesAndBoundaryConditions:
    """
    Tests unusual, boundary, and edge-case structures to ensure robust chemical parsing without crashes.
    """

    def test_stereochemistry_isomorphism_and_distinction(self, molecule_service):
        # L-Alanine vs D-Alanine
        l_ala = "C[C@H](N)C(=O)O"
        d_ala = "C[C@@H](N)C(=O)O"
        
        canonical_l = molecule_service.get_canonical_smiles(molecule_service.parse_smiles(l_ala))
        canonical_d = molecule_service.get_canonical_smiles(molecule_service.parse_smiles(d_ala))
        
        # Stereocenters should be preserved in canonical representation
        assert canonical_l != canonical_d
        
        # Their molecular formulas and weights should be identical
        meta_l = molecule_service.extract_metadata(l_ala)
        meta_d = molecule_service.extract_metadata(d_ala)
        assert meta_l.molecular_formula == meta_d.molecular_formula == "C3H7NO2"
        assert meta_l.molecular_weight == meta_d.molecular_weight

    def test_charged_ionic_species(self, molecule_service):
        # Ammonium cation
        ammonium = molecule_service.parse_smiles("[NH4+]")
        assert ammonium.GetAtomWithIdx(0).GetFormalCharge() == 1
        
        # Benzoate anion
        benzoate = molecule_service.extract_metadata("[O-]C(=O)c1ccccc1")
        assert benzoate.heavy_atom_count == 9

    def test_salt_mixtures_and_multicomponent_structures(self, molecule_service):
        # Sodium acetate salt
        meta = molecule_service.extract_metadata("CC(=O)[O-].[Na+]")
        assert "." in meta.canonical_smiles or "Na" in meta.molecular_formula

    def test_invalid_smiles_boundary_handling(self, molecule_service):
        with pytest.raises(InvalidSMILESError):
            molecule_service.parse_smiles("InvalidSMILESString123")
            
        with pytest.raises(InvalidSMILESError):
            molecule_service.parse_smiles("")
            
        with pytest.raises(InvalidSMILESError):
            molecule_service.parse_smiles("   ")
            
        with pytest.raises(InvalidSMILESError):
            molecule_service.parse_smiles(None)
            
        # Unclosed ring boundary
        with pytest.raises(InvalidSMILESError):
            molecule_service.parse_smiles("C1CCC")
            
        # Unclosed branch boundary
        with pytest.raises(InvalidSMILESError):
            molecule_service.parse_smiles("CC(O")

    def test_large_polymer_or_macromolecule_handling(self, molecule_service):
        # Long aliphatic chain (C50H102)
        smiles = "C" * 50
        meta = molecule_service.extract_metadata(smiles)
        assert meta.heavy_atom_count == 50
        # Should flag Lipinski MW violation
        assert meta.molecular_weight > 500


class TestMCSAndSVGRenderingContracts:
    """
    Verifies Maximum Common Substructure (MCS) calculation and SVG structure generation APIs.
    """

    def test_mcs_between_aspirin_and_salicylic_acid(self):
        # Aspirin: CC(=O)Oc1ccccc1C(=O)O
        # Salicylic acid: O=C(O)c1ccccc1O
        # Both share the substituted benzene + carboxylic acid + oxygen (at least 9 heavy atoms: 6 ring C + 1 carboxyl C + 2 O)
        import asyncio
        res = asyncio.run(compare_molecules("CC(=O)Oc1ccccc1C(=O)O", "O=C(O)c1ccccc1O"))
        assert res["success"] is True
        data = res["data"]
        assert data["matched_atoms"] >= 9
        assert data["tanimoto_similarity"] > 0.3
        assert data["mcs_coverage_pct"] > 60.0

    def test_svg_rendering_endpoint_contract(self):
        import asyncio
        # Render clean dark theme SVG
        resp_dark = asyncio.run(render_molecule_svg(smiles="CCO", highlight=None, width=320, height=220, theme="dark"))
        assert resp_dark.media_type == "image/svg+xml"
        svg_content = resp_dark.body.decode("utf-8") if hasattr(resp_dark, "body") else str(resp_dark.content)
        assert "<svg" in svg_content
        assert "</svg>" in svg_content
        
        # Render with substructure highlight
        resp_high = asyncio.run(render_molecule_svg(smiles="CC(=O)Oc1ccccc1C(=O)O", highlight="c1ccccc1", width=400, height=300, theme="light"))
        assert resp_high.media_type == "image/svg+xml"

    def test_svg_placeholder_on_invalid_smiles(self):
        import asyncio
        resp_invalid = asyncio.run(render_molecule_svg(smiles="InvalidSyntax123", width=320, height=220, theme="dark"))
        assert resp_invalid.media_type == "image/svg+xml"
        svg_content = resp_invalid.body.decode("utf-8") if hasattr(resp_invalid, "body") else str(resp_invalid.content)
        assert "Invalid SMILES" in svg_content


def test_custom_descriptor_registration(molecule_service):
    def count_carbons(mol):
        return sum(1 for atom in mol.GetAtoms() if atom.GetSymbol() == 'C')
        
    molecule_service.register_descriptor("carbon_count", count_carbons)
    metadata = molecule_service.extract_metadata("CCO")
    assert getattr(metadata, "carbon_count", None) == 2
