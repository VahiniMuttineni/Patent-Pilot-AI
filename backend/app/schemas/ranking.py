from pydantic import BaseModel, ConfigDict
from app.schemas.retrieval import UnifiedPatent

class PatentRankingBreakdown(BaseModel):
    molecular_similarity: float = 0.0
    semantic_similarity: float = 0.0
    keyword_match: float = 0.0
    metadata_quality: float = 0.0
    publication_recency: float = 0.0

class RankedPatent(BaseModel):
    patent: UnifiedPatent
    final_score: float
    confidence_score: float
    ranking_reason: str
    breakdown: PatentRankingBreakdown
    
    model_config = ConfigDict(from_attributes=True)
