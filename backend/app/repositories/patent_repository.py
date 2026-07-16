from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from app.models.domain import Patent
from app.schemas.patent import PatentCreate

class PatentRepository(BaseRepository[Patent, PatentCreate, PatentCreate]):
    def __init__(self, db: AsyncSession):
        super().__init__(model=Patent, db=db)

    async def get_by_patent_number(self, patent_number: str) -> Optional[Patent]:
        stmt = select(self.model).where(self.model.patent_number == patent_number)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_by_patent_numbers(self, patent_numbers: List[str]) -> List[Patent]:
        stmt = select(self.model).where(self.model.patent_number.in_(patent_numbers))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
