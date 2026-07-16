from typing import List
import uuid
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from app.models.domain import SearchHistory, SearchHistoryPatent, PatentAnalysis, PatentReport, LLMUsageTracking
from app.schemas.search import SearchHistoryCreate

class SearchRepository(BaseRepository[SearchHistory, SearchHistoryCreate, SearchHistoryCreate]):

    def __init__(self, db: AsyncSession):
        super().__init__(model=SearchHistory, db=db)

    async def get_user_search_history(self, user_id: uuid.UUID, skip: int = 0, limit: int = 50) -> List[SearchHistory]:
        stmt = select(self.model).where(self.model.user_id == user_id).order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def delete(self, id: uuid.UUID) -> bool:
        """
        Safely delete a search history record along with all foreign-key dependent records.
        """
        search_obj = await self.get_by_id(id)
        if not search_obj:
            return False

        try:
            # Explicit cascade deletes to prevent foreign key constraint violations
            await self.db.execute(delete(PatentReport).where(PatentReport.search_history_id == id))
            await self.db.execute(delete(PatentAnalysis).where(PatentAnalysis.search_history_id == id))
            await self.db.execute(delete(SearchHistoryPatent).where(SearchHistoryPatent.search_history_id == id))
            await self.db.execute(delete(LLMUsageTracking).where(LLMUsageTracking.search_history_id == id))
            
            await self.db.delete(search_obj)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            raise ValueError(f"Failed to delete search history record: {e}")

