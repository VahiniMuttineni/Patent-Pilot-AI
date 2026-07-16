import pytest
import json
from unittest.mock import AsyncMock
from datetime import date

from app.schemas.molecule import MoleculeMetadata
from app.schemas.retrieval import UnifiedPatent
from app.schemas.ranking import RankedPatent, PatentRankingBreakdown
from app.services.llm.gemini_client import GeminiService
from app.services.llm.report_generator import ReportGenerator
from app.services.llm.context_builder import ContextBuilder
from app.schemas.report import PatentabilityReportSchema

@pytest.fixture
def sample_molecule_meta():
    return MoleculeMetadata(
        canonical_smiles="CCO",
        molecular_formula="C2H6O",
        molecular_weight=46.07,
        num_atoms=9,
        num_bonds=8,
        heavy_atom_count=3,
        ring_count=0
    )

@pytest.fixture
def sample_ranked_patents():
    p = UnifiedPatent(
        patent_number="US123",
        title="Ethanol process",
        abstract="Making ethanol",
        publication_date=date(2020, 1, 1),
        source="Test"
    )
    
    breakdown = PatentRankingBreakdown(
        molecular_similarity=1.0,
        semantic_similarity=0.9
    )
    
    rp = RankedPatent(
        patent=p,
        final_score=0.95,
        confidence_score=0.9,
        ranking_reason="Exact match",
        breakdown=breakdown
    )
    return [rp]

@pytest.mark.asyncio
async def test_context_builder(sample_ranked_patents):
    builder = ContextBuilder()
    context = builder.build_patents_context(sample_ranked_patents)
    assert "US123" in context
    assert "Ethanol process" in context
    assert "0.95" in context

@pytest.mark.asyncio
async def test_report_generator_success(sample_molecule_meta, sample_ranked_patents):
    mock_gemini = AsyncMock(spec=GeminiService)
    
    # Mocking a valid JSON response from Gemini
    valid_json = json.dumps({
        "executive_summary": "Clear to proceed.",
        "patent_analyses": [
            {
                "patent_number": "US123",
                "relevance_reason": "High molecular similarity.",
                "chemical_similarities": "Exact match for ethanol.",
                "novelty_concerns": "None for use case.",
                "potential_claim_overlap": "Low",
                "confidence": 0.9,
                "risk_level": "Low",
                "reasoning": "Deteriminstic score is 0.95"
            }
        ],
        "overall_novelty_concerns": "Low",
        "patents_requiring_manual_review": [],
        "recommendation": "Clear to Proceed",
        "overall_confidence": 0.95,
        "reasoning": "Evidence supports clear FTO."
    })
    
    mock_gemini.generate_content_json.return_value = (valid_json, {"input_tokens": 100})
    
    generator = ReportGenerator(llm_client=mock_gemini)
    
    report, metrics = await generator.generate_report("CCO", sample_molecule_meta, sample_ranked_patents)
    
    assert isinstance(report, PatentabilityReportSchema)
    assert report.recommendation == "Clear to Proceed"
    assert report.patent_analyses[0].patent_number == "US123"
    assert metrics["repair_attempts"] == 0

@pytest.mark.asyncio
async def test_report_generator_repair_logic(sample_molecule_meta, sample_ranked_patents):
    mock_gemini = AsyncMock(spec=GeminiService)
    
    invalid_json = "{ broken json"
    
    valid_json = json.dumps({
        "executive_summary": "Repaired.",
        "patent_analyses": [],
        "overall_novelty_concerns": "N/A",
        "patents_requiring_manual_review": [],
        "recommendation": "Blocked",
        "overall_confidence": 0.1,
        "reasoning": "Fixed JSON."
    })
    
    # Side effect: first call returns broken json, second call returns repaired json
    mock_gemini.generate_content_json.side_effect = [
        (invalid_json, {}),
        (valid_json, {})
    ]
    
    generator = ReportGenerator(llm_client=mock_gemini)
    report, metrics = await generator.generate_report("CCO", sample_molecule_meta, sample_ranked_patents)
    
    assert report.recommendation == "Blocked"
    assert metrics["repair_attempts"] == 1
