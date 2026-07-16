from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date

class UnifiedPatent(BaseModel):
    """
    Unified Patent schema independent of the source provider.
    """
    patent_number: str
    title: str
    abstract: str
    publication_date: Optional[date] = None
    assignee: Optional[str] = None
    source: str
    url: Optional[str] = None
    molecule_match_info: Optional[str] = None
    markush_smiles: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ScientificMetadata(BaseModel):
    chembl_id: str
    compound_name: Optional[str] = None
    synonyms: List[str] = Field(default_factory=list)
    targets: List[str] = Field(default_factory=list)
    bioactivity: Optional[str] = None
    mechanism_of_action: Optional[str] = None

class ScientificArticle(BaseModel):
    pmid: str
    title: str
    authors: List[str] = Field(default_factory=list)
    journal: str
    publication_date: Optional[date] = None
    abstract: Optional[str] = None

class ProviderMetadata(BaseModel):
    provider_name: str
    source_type: str
    retrieval_method: str
    status: str
    num_results: int
    response_time_ms: float
    error: Optional[str] = None
    reason: Optional[str] = None

class ProviderResponse(BaseModel):
    patents: List[UnifiedPatent] = Field(default_factory=list)
    scientific_metadata: List[ScientificMetadata] = Field(default_factory=list)
    scientific_articles: List[ScientificArticle] = Field(default_factory=list)
    metadata: ProviderMetadata

class RetrievalMetrics(BaseModel):
    total_retrieved: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    providers: List[ProviderMetadata] = Field(default_factory=list)
    total_latency_ms: float = 0.0

class RetrievalResult(BaseModel):
    patents: List[UnifiedPatent] = Field(default_factory=list)
    scientific_metadata: List[ScientificMetadata] = Field(default_factory=list)
    scientific_articles: List[ScientificArticle] = Field(default_factory=list)
    metrics: RetrievalMetrics
