from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from app.models.domain import User
from app.schemas.user import UserCreate

class UserRepository(BaseRepository[User, UserCreate, UserCreate]):
    def __init__(self, db: AsyncSession):
        super().__init__(model=User, db=db)

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(self.model).where(self.model.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
        
    async def get_by_google_id(self, google_id: str) -> Optional[User]:
        stmt = select(self.model).where(self.model.google_id == google_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
