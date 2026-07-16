from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class SearchHistoryBase(BaseModel):
    input_smiles: str
    input_target: Optional[str] = None
    input_disease: Optional[str] = None
    status: str = "PENDING"


class SearchHistoryCreate(SearchHistoryBase):
    pass


class SearchHistoryResponse(SearchHistoryBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
