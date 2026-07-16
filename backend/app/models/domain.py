import uuid
from datetime import date
from typing import List, Optional
from sqlalchemy import String, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    google_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)

    searches: Mapped[List["SearchHistory"]] = relationship(
        "SearchHistory",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    saved_patents: Mapped[List["SavedPatent"]] = relationship(
        "SavedPatent",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class SearchHistory(TimestampMixin, Base):
    __tablename__ = "search_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    input_smiles: Mapped[str] = mapped_column(String)
    input_target: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    input_disease: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(
        String, default="PENDING"
    )  # PENDING, RUNNING, COMPLETED, FAILED
    current_stage: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    progress_percentage: Mapped[int] = mapped_column(Float, default=0.0)
    execution_timeline: Mapped[dict] = mapped_column(JSON, default=dict)
    compound_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    molecule_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


    user: Mapped["User"] = relationship("User", back_populates="searches")
    patents: Mapped[List["SearchHistoryPatent"]] = relationship(
        "SearchHistoryPatent",
        back_populates="search_history",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    analyses: Mapped[List["PatentAnalysis"]] = relationship(
        "PatentAnalysis",
        back_populates="search_history",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    report: Mapped[Optional["PatentReport"]] = relationship(
        "PatentReport",
        back_populates="search_history",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Patent(TimestampMixin, Base):
    __tablename__ = "patents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patent_number: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    publication_date: Mapped[date] = mapped_column(
        String
    )  # We will store as string YYYY-MM-DD for simplicity
    assignee: Mapped[str] = mapped_column(String)
    abstract: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String)

    search_links: Mapped[List["SearchHistoryPatent"]] = relationship(
        "SearchHistoryPatent",
        back_populates="patent",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    analyses: Mapped[List["PatentAnalysis"]] = relationship(
        "PatentAnalysis",
        back_populates="patent",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class SearchHistoryPatent(TimestampMixin, Base):
    __tablename__ = "search_history_patents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    search_history_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("search_history.id"), index=True
    )
    patent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patents.id"), index=True)
    component_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    final_score: Mapped[float] = mapped_column(Float)

    search_history: Mapped["SearchHistory"] = relationship(
        "SearchHistory", back_populates="patents"
    )
    patent: Mapped["Patent"] = relationship("Patent", back_populates="search_links")


class PatentAnalysis(TimestampMixin, Base):
    __tablename__ = "patent_analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patents.id"))
    search_history_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("search_history.id")
    )

    why_retrieved: Mapped[str] = mapped_column(Text)
    key_similarities: Mapped[str] = mapped_column(Text)
    novelty_concerns: Mapped[str] = mapped_column(Text)
    potential_claim_overlap: Mapped[str] = mapped_column(Text)
    confidence_score: Mapped[float] = mapped_column(Float)
    risk_level: Mapped[str] = mapped_column(String)  # LOW, MEDIUM, HIGH
    reasoning: Mapped[str] = mapped_column(Text)

    patent: Mapped["Patent"] = relationship("Patent", back_populates="analyses")
    search_history: Mapped["SearchHistory"] = relationship(
        "SearchHistory", back_populates="analyses"
    )


class PatentReport(TimestampMixin, Base):
    __tablename__ = "patent_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    search_history_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("search_history.id"), unique=True
    )

    executive_summary: Mapped[str] = mapped_column(Text)
    top_similar_patents: Mapped[list] = mapped_column(JSON)
    novelty_concerns: Mapped[str] = mapped_column(Text)
    patents_requiring_manual_review: Mapped[list] = mapped_column(JSON)
    overall_recommendation: Mapped[str] = mapped_column(String)
    patent_risk_score: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)

    search_history: Mapped["SearchHistory"] = relationship(
        "SearchHistory", back_populates="report"
    )


class SavedPatent(TimestampMixin, Base):
    __tablename__ = "saved_patents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    patent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patents.id"))

    user: Mapped["User"] = relationship("User", back_populates="saved_patents")
    patent: Mapped["Patent"] = relationship("Patent")


class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String)
    target_type: Mapped[str] = mapped_column(String)
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    details: Mapped[dict] = mapped_column(JSON, default=dict)


class LLMUsageTracking(TimestampMixin, Base):
    __tablename__ = "llm_usage_tracking"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    model_name: Mapped[str] = mapped_column(String)
    prompt_version: Mapped[str] = mapped_column(String)
    input_tokens: Mapped[int] = mapped_column(Float)
    output_tokens: Mapped[int] = mapped_column(Float)
    latency_ms: Mapped[float] = mapped_column(Float)
    estimated_cost_usd: Mapped[float] = mapped_column(Float)
    search_history_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("search_history.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String)
