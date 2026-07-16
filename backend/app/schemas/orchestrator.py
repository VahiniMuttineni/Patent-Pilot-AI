import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.schemas.molecule import MoleculeMetadata
from app.schemas.retrieval import UnifiedPatent, ScientificMetadata, ScientificArticle
from app.schemas.ranking import RankedPatent
from app.schemas.report import PatentabilityReportSchema

class PipelineContext(BaseModel):
    """
    Single source of truth for the Search Orchestration pipeline.
    Passed between all stages.
    """
    # Identifiers
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    search_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    
    # Input
    molecule_smiles: str
    molecule_name: Optional[str] = None
    molecule_target: Optional[str] = None
    molecule_disease: Optional[str] = None
    
    # Validation Stage
    canonical_smiles: Optional[str] = None
    molecule_metadata: Optional[MoleculeMetadata] = None
    
    # Retrieval Stage
    retrieved_patents: List[UnifiedPatent] = Field(default_factory=list)
    deduplicated_patents: List[UnifiedPatent] = Field(default_factory=list)
    scientific_metadata: List[ScientificMetadata] = Field(default_factory=list)
    scientific_articles: List[ScientificArticle] = Field(default_factory=list)
    
    # Ranking Stage
    ranked_patents: List[RankedPatent] = Field(default_factory=list)
    selected_patents: List[RankedPatent] = Field(default_factory=list) # Top N subset
    
    # LLM Stage
    llm_context: Optional[str] = None
    report: Optional[PatentabilityReportSchema] = None
    
    # Status & Error tracking
    status: str = "PENDING"
    current_stage: Optional[str] = None
    progress_percentage: float = 0.0
    errors: List[str] = Field(default_factory=list)
    
    # Metrics & Timings
    timings: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    
    # Specific latencies and counts for persistence
    metrics: Dict[str, Any] = Field(default_factory=lambda: {
        "total_execution_time_ms": 0.0,
        "rdkit_latency_ms": 0.0,
        "retrieval_latency_ms": 0.0,
        "embedding_latency_ms": 0.0,
        "faiss_latency_ms": 0.0,
        "ranking_latency_ms": 0.0,
        "llm_latency_ms": 0.0,
        "database_latency_ms": 0.0,
        "cache_hits": 0,
        "cache_misses": 0,
        "providers": [],
        "llm_input_tokens": 0,
        "llm_output_tokens": 0,
        "llm_retries": 0,
        "llm_repair_attempts": 0
    })

    def record_stage_timing(self, stage_name: str, duration_ms: float, timestamp: Optional[datetime] = None):
        if not timestamp:
            timestamp = datetime.now(timezone.utc)
        self.timings[stage_name] = {
            "timestamp": timestamp.isoformat(),
            "duration_ms": duration_ms
        }
