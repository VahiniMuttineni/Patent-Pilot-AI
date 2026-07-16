import logging
import time
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import BackgroundTasks

from app.schemas.orchestrator import PipelineContext
from app.services.molecule_service import MoleculeService
from app.services.retrieval_service import RetrievalService
from app.services.ranking_service import RankingService
from app.services.llm.report_generator import ReportGenerator

from app.repositories.search_repository import SearchRepository
from app.repositories.patent_repository import PatentRepository
from app.repositories.report_repository import ReportRepository

from app.services.compound_resolver import compound_resolver_service
from app.schemas.molecule import MoleculeMetadata

logger = logging.getLogger(__name__)


class SearchOrchestratorService:
    """
    Central orchestration engine for PatentPilot AI pipeline.
    Contains no business logic; solely coordinates the PipelineContext through various stages.
    """

    def __init__(
        self,
        db_session: AsyncSession,
        molecule_service: MoleculeService,
        retrieval_service: RetrievalService,
        ranking_service: RankingService,
        report_generator: ReportGenerator
    ):
        self.db_session = db_session
        self.molecule_service = molecule_service
        self.retrieval_service = retrieval_service
        self.ranking_service = ranking_service
        self.report_generator = report_generator
        
        self.search_repo = SearchRepository(db_session)
        self.patent_repo = PatentRepository(db_session)
        self.report_repo = ReportRepository(db_session)

    async def initiate_search(self, ctx: PipelineContext, background_tasks: BackgroundTasks) -> PipelineContext:
        """
        Validates input, persists PENDING state, and triggers background processing.
        """
        ctx.status = "PENDING"
        ctx.current_stage = "Initiating"
        ctx.progress_percentage = 0.0
        
        # 1. Immediate Validation
        start = time.time()
        try:
            await self._validate(ctx)
        except Exception as e:
            ctx.status = "FAILED"
            ctx.errors.append(f"Validation Error: {e}")
            logger.error(f"[{ctx.request_id}] Validation failed: {e}")
            return ctx
        ctx.record_stage_timing("Validation", (time.time() - start) * 1000)
        
        # 2. Persist Initial State
        start_db = time.time()
        pref_name = ctx.molecule_metadata.preferred_name or getattr(ctx.molecule_metadata, "compound_name", None) or "Unknown Compound"
        search_record = await self.search_repo.create({
            "user_id": ctx.user_id,
            "input_smiles": ctx.molecule_smiles,
            "input_target": ctx.molecule_target,
            "input_disease": ctx.molecule_disease,
            "compound_name": pref_name,
            "molecule_metadata": ctx.molecule_metadata.model_dump() if ctx.molecule_metadata else {},
            "status": ctx.status,
            "current_stage": ctx.current_stage,
            "progress_percentage": ctx.progress_percentage
        })
        ctx.search_id = search_record.id
        ctx.metrics["database_latency_ms"] += (time.time() - start_db) * 1000
        
        logger.info(f"[{ctx.request_id}] Initiated search {ctx.search_id} for resolved compound '{pref_name}'")
        
        # 3. Hand off to background worker (abstracted interface)
        background_tasks.add_task(self.execute_pipeline, ctx)
        
        return ctx

    async def execute_pipeline(self, ctx: PipelineContext):
        """
        Executes the full AI pipeline synchronously within the async worker.
        """
        pipeline_start = time.time()
        logger.info(f"[{ctx.request_id}] Beginning pipeline execution for search {ctx.search_id}")
        
        try:
            if not ctx.canonical_smiles or not ctx.molecule_metadata:
                await self._validate(ctx)
                
            # Stage 1: Mark Running
            await self._update_status(ctx, "RUNNING", "Retrieving Patents", 10.0)
            
            # Stage 2: Retrieve
            await self._retrieve(ctx)
            if not ctx.deduplicated_patents:
                await self._update_status(ctx, "COMPLETED", "No patents found", 100.0)
                return
                
            # Stage 3: Rank
            await self._update_status(ctx, "RUNNING", "Ranking Patents", 40.0)
            await self._rank(ctx)
            
            # Stage 4: AI Analysis
            await self._update_status(ctx, "RUNNING", "Generating AI Report", 70.0)
            await self._analyze(ctx)
            
            # Stage 5: Final Persistence
            await self._update_status(ctx, "RUNNING", "Saving Results", 95.0)
            await self._persist(ctx)
            
            # Stage 6: Complete
            ctx.metrics["total_execution_time_ms"] = (time.time() - pipeline_start) * 1000
            await self._update_status(ctx, "COMPLETED", "Completed", 100.0)
            logger.info(f"[{ctx.request_id}] Pipeline completed successfully for search {ctx.search_id}")
            
        except Exception as e:
            logger.exception(f"[{ctx.request_id}] Pipeline failed: {e}")
            ctx.errors.append(str(e))
            ctx.metrics["total_execution_time_ms"] = (time.time() - pipeline_start) * 1000
            await self._update_status(ctx, "FAILED", "Failed", 0.0)

    # --- Pipeline Stages ---

    async def _validate(self, ctx: PipelineContext):
        """Executes 5-step Compound Resolution Pipeline: SMILES -> Canonicalization -> PubChem -> ChemSpider -> ChEMBL -> Fallback."""
        start = time.time()
        resolution = await compound_resolver_service.resolve_smiles(ctx.molecule_smiles)
        ctx.canonical_smiles = resolution["canonical_smiles"]
        ctx.molecule_metadata = MoleculeMetadata(**resolution)
        ctx.metrics["compound_resolution_latency_ms"] = (time.time() - start) * 1000


    async def _retrieve(self, ctx: PipelineContext):
        """Orchestrates patent retrieval and deduplication."""
        start = time.time()
        result = await self.retrieval_service.retrieve_patents(ctx.canonical_smiles)
        ctx.deduplicated_patents = result.patents
        ctx.scientific_metadata = result.scientific_metadata
        ctx.scientific_articles = result.scientific_articles
        
        # Merge metrics
        ctx.metrics["retrieval_latency_ms"] = result.metrics.total_latency_ms
        ctx.metrics["cache_hits"] = result.metrics.cache_hits
        ctx.metrics["cache_misses"] = result.metrics.cache_misses
        ctx.metrics["providers"] = [p.model_dump() for p in result.metrics.providers]
        
        ctx.record_stage_timing("Patent Retrieval", (time.time() - start) * 1000)

    async def _rank(self, ctx: PipelineContext):
        """Orchestrates FAISS semantic search and explainable ranking."""
        start = time.time()
        
        # Compute chemical similarities for ranking engine
        mol_sims = {}
        for p in ctx.deduplicated_patents:
            if p.markush_smiles and p.markush_smiles != ctx.canonical_smiles:
                try:
                    mol_sims[p.patent_number] = self.molecule_service.calculate_similarity_from_smiles(ctx.canonical_smiles, p.markush_smiles)
                except Exception:
                    mol_sims[p.patent_number] = 0.75
            else:
                mol_sims[p.patent_number] = 1.0
            
        ranked, ranking_metrics = await self.ranking_service.rank_patents(
            query_text=f"{ctx.molecule_target or ''} {ctx.molecule_disease or ''}",
            query_smiles=ctx.canonical_smiles,
            patents=ctx.deduplicated_patents,
            top_k=10,
            molecule_similarities=mol_sims
        )
        
        ctx.ranked_patents = ranked
        ctx.selected_patents = ranked[:5] # Top 5 for LLM
        
        ctx.metrics["embedding_latency_ms"] = ranking_metrics.get("embedding_latency_ms", 0.0)
        ctx.metrics["ranking_latency_ms"] = ranking_metrics.get("ranking_latency_ms", 0.0)
        ctx.record_stage_timing("Ranking", (time.time() - start) * 1000)

    async def _analyze(self, ctx: PipelineContext):
        """Orchestrates Gemini AI report generation."""
        start = time.time()
        report, metrics = await self.report_generator.generate_report(
            molecule_smiles=ctx.canonical_smiles,
            molecule_metadata=ctx.molecule_metadata,
            ranked_patents=ctx.selected_patents,
            scientific_metadata=ctx.scientific_metadata,
            scientific_articles=ctx.scientific_articles,
            prompt_version="v1"
        )
        ctx.report = report
        
        ctx.metrics["llm_latency_ms"] = metrics.get("latency_ms", 0.0)
        ctx.metrics["llm_input_tokens"] = metrics.get("input_tokens", 0)
        ctx.metrics["llm_output_tokens"] = metrics.get("output_tokens", 0)
        ctx.metrics["llm_retries"] = metrics.get("retries", 0)
        ctx.metrics["llm_repair_attempts"] = metrics.get("repair_attempts", 0)
        
        ctx.record_stage_timing("AI Analysis", (time.time() - start) * 1000)

    async def _persist(self, ctx: PipelineContext):
        """Handles robust database persistence using transactions."""
        start = time.time()
        
        # Save Patents (batch query existing to avoid loop lookups)
        from sqlalchemy import select
        from app.models.domain import Patent
        patent_numbers = [rp.patent.patent_number for rp in ctx.selected_patents if rp.patent and rp.patent.patent_number]
        existing_patents = {}
        if patent_numbers:
            stmt = select(Patent).where(Patent.patent_number.in_(patent_numbers))
            result = await self.db_session.execute(stmt)
            for p_db in result.scalars().all():
                existing_patents[p_db.patent_number] = p_db.id
                
        patent_db_ids = {}
        new_patents_to_add = []
        for rp in ctx.selected_patents:
            p = rp.patent
            if not p:
                continue
            if p.patent_number in existing_patents:
                patent_db_ids[p.patent_number] = existing_patents[p.patent_number]
            else:
                new_p = Patent(
                    patent_number=p.patent_number or str(uuid.uuid4()),
                    title=p.title or f"Patent {p.patent_number}",
                    publication_date=str(p.publication_date) if p.publication_date else "Unknown",
                    assignee=p.assignee or "Unknown",
                    abstract=p.abstract or "",
                    source=p.source or "SureChEMBL"
                )
                self.db_session.add(new_p)
                new_patents_to_add.append((p.patent_number, new_p))
                
        if new_patents_to_add:
            await self.db_session.flush()
            for p_num, new_p in new_patents_to_add:
                patent_db_ids[p_num] = new_p.id
                existing_patents[p_num] = new_p.id

        # Save SearchHistory -> Patent relationship rows
        from app.models.domain import SearchHistoryPatent, PatentAnalysis as DomainPatentAnalysis
        for rp in ctx.selected_patents:
            p = rp.patent
            if p.patent_number in patent_db_ids:
                shp = SearchHistoryPatent(
                    search_history_id=ctx.search_id,
                    patent_id=patent_db_ids[p.patent_number],
                    component_scores=rp.breakdown.model_dump() if hasattr(rp, 'breakdown') and rp.breakdown else {},
                    final_score=float(rp.final_score)
                )
                self.db_session.add(shp)

        # Save Report
        if ctx.report:
            await self.report_repo.create({
                "search_history_id": ctx.search_id,
                "executive_summary": ctx.report.executive_summary,
                "top_similar_patents": [pa.model_dump() for pa in ctx.report.patent_analyses],
                "novelty_concerns": ctx.report.overall_novelty_concerns,
                "patents_requiring_manual_review": ctx.report.patents_requiring_manual_review,
                "overall_recommendation": ctx.report.recommendation,
                "patent_risk_score": 0.5, # Calculated heuristically
                "confidence": ctx.report.overall_confidence
            })
            
            # Save individual PatentAnalysis rows linking search and patents
            for pa in ctx.report.patent_analyses:
                target_pid = patent_db_ids.get(pa.patent_number)
                if not target_pid and patent_db_ids:
                    target_pid = list(patent_db_ids.values())[0]
                if target_pid:
                    domain_pa = DomainPatentAnalysis(
                        search_history_id=ctx.search_id,
                        patent_id=target_pid,
                        why_retrieved=pa.relevance_reason,
                        key_similarities=pa.chemical_similarities,
                        novelty_concerns=pa.novelty_concerns,
                        potential_claim_overlap=pa.potential_claim_overlap,
                        confidence_score=float(pa.confidence),
                        risk_level=pa.risk_level,
                        reasoning=pa.reasoning
                    )
                    self.db_session.add(domain_pa)

        await self.db_session.commit()
            
        ctx.metrics["database_latency_ms"] += (time.time() - start) * 1000
        ctx.record_stage_timing("Database Persistence", (time.time() - start) * 1000)

    async def _update_status(self, ctx: PipelineContext, status: str, stage: str, progress: float):
        """Helper to sync context status to the DB."""
        ctx.status = status
        ctx.current_stage = stage
        ctx.progress_percentage = progress
        
        start = time.time()
        
        # We must fetch the database object first since update expects ModelType, not ID
        search_record = await self.search_repo.get_by_id(ctx.search_id)
        if search_record:
            update_data = {
                "status": status,
                "current_stage": stage,
                "progress_percentage": progress,
                "execution_timeline": ctx.timings
            }
            if ctx.molecule_metadata:
                update_data["compound_name"] = ctx.molecule_metadata.compound_name
                update_data["molecule_metadata"] = ctx.molecule_metadata.model_dump()
            await self.search_repo.update(search_record, update_data)
            
        ctx.metrics["database_latency_ms"] += (time.time() - start) * 1000
