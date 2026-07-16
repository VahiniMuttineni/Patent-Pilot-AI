from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime


class PatentBase(BaseModel):
    patent_number: str
    title: str
    publication_date: str  # YYYY-MM-DD
    assignee: str
    abstract: str
    source: str


class PatentCreate(PatentBase):
    pass


class PatentResponse(PatentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
