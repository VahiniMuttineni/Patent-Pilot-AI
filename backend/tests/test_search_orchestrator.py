import pytest
import uuid
from unittest.mock import AsyncMock

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import BackgroundTasks

from app.schemas.orchestrator import PipelineContext
from app.services.search_orchestrator import SearchOrchestratorService
from app.services.molecule_service import MoleculeService
from app.services.retrieval_service import RetrievalService
from app.services.ranking_service import RankingService
from app.services.llm.report_generator import ReportGenerator

from app.models.domain import User

@pytest.fixture
def mock_retrieval_service():
    service = AsyncMock(spec=RetrievalService)
    from app.schemas.retrieval import RetrievalResult, RetrievalMetrics, UnifiedPatent
    from datetime import date
    mock_patent = UnifiedPatent(
        patent_number="US-123",
        title="Test",
        abstract="Test",
        publication_date=date.today(),
        source="test"
    )
    service.retrieve_patents.return_value = RetrievalResult(
        patents=[mock_patent], metrics=RetrievalMetrics()
    )
    return service

@pytest.fixture
def mock_ranking_service():
    service = AsyncMock(spec=RankingService)
    from app.schemas.ranking import RankedPatent, PatentRankingBreakdown
    from app.schemas.retrieval import UnifiedPatent
    from datetime import date
    mock_p = UnifiedPatent(
        patent_number="US-123",
        title="Test",
        abstract="Test",
        publication_date=date.today(),
        source="test"
    )
    mock_rp = RankedPatent(
        patent=mock_p,
        final_score=1.0,
        confidence_score=1.0,
        ranking_reason="Test",
        breakdown=PatentRankingBreakdown(molecular_similarity=1.0, semantic_similarity=1.0)
    )
    service.rank_patents.return_value = ([mock_rp], {})
    return service

@pytest.fixture
def mock_report_generator():
    service = AsyncMock(spec=ReportGenerator)
    from app.schemas.report import PatentabilityReportSchema
    service.generate_report.return_value = (
        PatentabilityReportSchema(
            executive_summary="Test",
            patent_analyses=[],
            overall_novelty_concerns="None",
            patents_requiring_manual_review=[],
            recommendation="Clear",
            overall_confidence=0.9,
            reasoning="Test"
        ),
        {}
    )
    return service

@pytest.mark.asyncio
async def test_orchestrator_pipeline_success(
    db_session: AsyncSession,
    mock_retrieval_service,
    mock_ranking_service,
    mock_report_generator
):
    # Setup user
    user = User(id=uuid.uuid4(), email="orch@test.com", hashed_password="pw")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    orchestrator = SearchOrchestratorService(
        db_session=db_session,
        molecule_service=MoleculeService(),
        retrieval_service=mock_retrieval_service,
        ranking_service=mock_ranking_service,
        report_generator=mock_report_generator
    )
    
    ctx = PipelineContext(
        user_id=user.id,
        molecule_smiles="CCO"
    )
    bg_tasks = BackgroundTasks()
    
    # Initiate
    ctx = await orchestrator.initiate_search(ctx, bg_tasks)
    
    assert ctx.status == "PENDING"
    assert ctx.search_id is not None
    
    # Execute pipeline directly since it's a test (normally bg task)
    await orchestrator.execute_pipeline(ctx)
    
    # Check context results
    assert ctx.status == "COMPLETED"
    assert ctx.current_stage == "Completed"
    assert ctx.progress_percentage == 100.0
    assert "total_execution_time_ms" in ctx.metrics
    assert "rdkit_latency_ms" in ctx.metrics
    
    # Check DB changes
    search_record = await orchestrator.search_repo.get_by_id(ctx.search_id)
    assert search_record.status == "COMPLETED"
    assert search_record.execution_timeline
    assert "Validation" in search_record.execution_timeline
    assert "Patent Retrieval" in search_record.execution_timeline

@pytest.mark.asyncio
async def test_orchestrator_invalid_molecule(
    db_session: AsyncSession,
    mock_retrieval_service,
    mock_ranking_service,
    mock_report_generator
):
    user = User(id=uuid.uuid4(), email="fail@test.com", hashed_password="pw")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    orchestrator = SearchOrchestratorService(
        db_session=db_session,
        molecule_service=MoleculeService(),
        retrieval_service=mock_retrieval_service,
        ranking_service=mock_ranking_service,
        report_generator=mock_report_generator
    )
    
    ctx = PipelineContext(
        user_id=user.id,
        molecule_smiles="INVALID_SMILES"
    )
    bg_tasks = BackgroundTasks()
    
    ctx = await orchestrator.initiate_search(ctx, bg_tasks)
    
    # Should fail validation immediately
    assert ctx.status == "FAILED"
    assert len(ctx.errors) > 0
    assert "InvalidSMILESError" in ctx.errors[0] or "Validation Error" in ctx.errors[0]
