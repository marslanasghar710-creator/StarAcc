import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import (
    AIJobStatus,
    AIJobType,
    AutomationRuleType,
    DocumentClassifierLabel,
    DocumentExtractionStatus,
    SuggestionFeedbackAction,
    SuggestionSourceType,
    SuggestionStatus,
)
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class AutomationRule(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "automation_rules"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    rule_type: Mapped[AutomationRuleType] = mapped_column(Enum(AutomationRuleType, name="automationruletype"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    conditions_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    actions_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Suggestion(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "suggestions"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    target_entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    target_entity_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    suggestion_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[SuggestionStatus] = mapped_column(Enum(SuggestionStatus, name="suggestionstatus"), nullable=False, default=SuggestionStatus.PENDING, index=True)
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    reason_summary: Mapped[str] = mapped_column(String(500), nullable=False)
    explanation_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    suggested_payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    source_type: Mapped[SuggestionSourceType] = mapped_column(Enum(SuggestionSourceType, name="suggestionsourcetype"), nullable=False)
    provider_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    input_fingerprint: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SuggestionFeedback(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "suggestion_feedback"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    suggestion_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suggestions.id"), nullable=False, index=True)
    action: Mapped[SuggestionFeedbackAction] = mapped_column(Enum(SuggestionFeedbackAction, name="suggestionfeedbackaction"), nullable=False)
    feedback_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)


class DocumentExtractionJob(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "document_extraction_jobs"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stored_files.id"), nullable=False, index=True)
    status: Mapped[DocumentExtractionStatus] = mapped_column(Enum(DocumentExtractionStatus, name="documentextractionstatus"), nullable=False, default=DocumentExtractionStatus.PENDING, index=True)
    classifier_label: Mapped[DocumentClassifierLabel | None] = mapped_column(Enum(DocumentClassifierLabel, name="documentclassifierlabel"), nullable=True)
    classifier_confidence: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    extracted_fields_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    review_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    provider_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ReconciliationSuggestionSet(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "reconciliation_suggestion_sets"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    bank_transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bank_transactions.id"), nullable=False, index=True)
    generation_status: Mapped[AIJobStatus] = mapped_column(Enum(AIJobStatus, name="aijobstatus"), nullable=False, default=AIJobStatus.PENDING)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_summary_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class AIProcessingJob(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "ai_processing_jobs"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    job_type: Mapped[AIJobType] = mapped_column(Enum(AIJobType, name="aijobtype"), nullable=False)
    target_entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    target_entity_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[AIJobStatus] = mapped_column(Enum(AIJobStatus, name="aijobstatus", create_type=False), nullable=False, default=AIJobStatus.PENDING, index=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    result_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
