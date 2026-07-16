from typing import Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from app.models.domain import PatentReport
from pydantic import BaseModel

# We create a dummy create schema for generic constraint if it doesn't exist yet, 
# or just use BaseModel for now since we haven't defined PatentReportCreate in schemas.
class PatentReportCreate(BaseModel):
    search_history_id: uuid.UUID
    executive_summary: str
    top_similar_patents: list
    novelty_concerns: str
    patents_requiring_manual_review: list
    overall_recommendation: str
    patent_risk_score: float
    confidence: float

class ReportRepository(BaseRepository[PatentReport, PatentReportCreate, PatentReportCreate]):
    def __init__(self, db: AsyncSession):
        super().__init__(model=PatentReport, db=db)

    async def get_by_search_id(self, search_history_id: uuid.UUID) -> Optional[PatentReport]:
        stmt = select(self.model).where(self.model.search_history_id == search_history_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
