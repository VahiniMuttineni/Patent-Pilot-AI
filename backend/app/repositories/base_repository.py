from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, exc, delete
from pydantic import BaseModel
from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: Any) -> Optional[ModelType]:
        stmt = select(self.model).where(self.model.id == id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        stmt = select(self.model).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, obj_in: Union[CreateSchemaType, Dict[str, Any]]) -> ModelType:
        obj_in_data = obj_in.model_dump() if isinstance(obj_in, BaseModel) else obj_in
        db_obj = self.model(**obj_in_data)
        self.db.add(db_obj)
        try:
            await self.db.commit()
            await self.db.refresh(db_obj)
            return db_obj
        except exc.IntegrityError as e:
            await self.db.rollback()
            raise ValueError(f"Database integrity error: {e}")

    async def update(self, db_obj: ModelType, obj_in: Union[UpdateSchemaType, Dict[str, Any]]) -> ModelType:
        obj_data = obj_in.model_dump(exclude_unset=True) if isinstance(obj_in, BaseModel) else obj_in
        for field in obj_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, obj_data[field])
        self.db.add(db_obj)
        try:
            await self.db.commit()
            await self.db.refresh(db_obj)
            return db_obj
        except exc.IntegrityError as e:
            await self.db.rollback()
            raise ValueError(f"Database integrity error: {e}")

    async def delete(self, id: Any) -> bool:
        stmt = delete(self.model).where(self.model.id == id)
        try:
            result = await self.db.execute(stmt)
            await self.db.commit()
            return result.rowcount > 0
        except exc.IntegrityError as e:
            await self.db.rollback()
            raise ValueError(f"Database integrity error on delete: {e}")

    async def exists(self, **kwargs) -> bool:
        stmt = select(self.model).filter_by(**kwargs).limit(1)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def count(self, **kwargs) -> int:
        stmt = select(func.count()).select_from(self.model)
        if kwargs:
            stmt = stmt.filter_by(**kwargs)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def filter(self, skip: int = 0, limit: int = 100, **kwargs) -> List[ModelType]:
        stmt = select(self.model).filter_by(**kwargs).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def paginate(self, page: int = 1, page_size: int = 50, **kwargs) -> dict:
        total = await self.count(**kwargs)
        skip = (page - 1) * page_size
        items = await self.filter(skip=skip, limit=page_size, **kwargs)
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }

    async def bulk_create(self, objects_in: List[Union[CreateSchemaType, Dict[str, Any]]]) -> List[ModelType]:
        db_objs = [
            self.model(**(obj.model_dump() if isinstance(obj, BaseModel) else obj))
            for obj in objects_in
        ]
        self.db.add_all(db_objs)
        try:
            await self.db.commit()
            for obj in db_objs:
                await self.db.refresh(obj)
            return db_objs
        except exc.IntegrityError as e:
            await self.db.rollback()
            raise ValueError(f"Database bulk insert error: {e}")
