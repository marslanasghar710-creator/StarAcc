from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

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
from app.schemas.common import ORMModel


class SafeORMModel(ORMModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class RuleCondition(BaseModel):
    field: str
    operator: str
    value: Any | None = None


class RuleConditions(BaseModel):
    all: list[RuleCondition] = Field(default_factory=list)
    any: list[RuleCondition] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_non_empty(self):
        if not self.all and not self.any:
            raise ValueError("At least one rule condition is required")
        return self


class RuleActions(BaseModel):
    suggestion_type: str
    reason_summary: str
    suggestion_payload: dict[str, Any] = Field(default_factory=dict)
    auto_apply_safe: bool = False


class AutomationRuleCreateRequest(BaseModel):
    rule_type: AutomationRuleType
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    priority: int = Field(default=100, ge=1, le=1000)
    is_active: bool = True
    conditions_json: RuleConditions
    actions_json: RuleActions


class AutomationRuleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    priority: int | None = Field(default=None, ge=1, le=1000)
    is_active: bool | None = None
    conditions_json: RuleConditions | None = None
    actions_json: RuleActions | None = None
    archived_at: datetime | None = None


class AutomationRuleResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    rule_type: AutomationRuleType
    name: str
    description: str | None
    priority: int
    is_active: bool
    conditions_json: dict
    actions_json: dict
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AutomationRuleListResponse(BaseModel):
    items: list[AutomationRuleResponse]


class AutomationRuleTestRequest(BaseModel):
    target_payload: dict[str, Any]


class AutomationRuleTestResult(BaseModel):
    matched: bool
    explanation: dict[str, Any]
    suggestion_payload: dict[str, Any] | None = None


class SuggestionResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    target_entity_type: str
    target_entity_id: str
    suggestion_type: str
    status: SuggestionStatus
    confidence_score: Decimal | None
    reason_summary: str
    explanation_json: dict | None
    suggested_payload_json: dict
    source_type: SuggestionSourceType
    provider_name: str | None
    provider_model: str | None
    provider_version: str | None
    input_fingerprint: str | None
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    applied_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime


class SuggestionListResponse(BaseModel):
    items: list[SuggestionResponse]


class SuggestionReviewRequest(BaseModel):
    feedback_reason: str | None = None


class SuggestionFeedbackResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    suggestion_id: UUID
    action: SuggestionFeedbackAction
    feedback_reason: str | None
    user_id: UUID
    created_at: datetime


class DocumentExtractionRequest(BaseModel):
    file_id: UUID


class DocumentExtractionJobResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    file_id: UUID
    status: DocumentExtractionStatus
    classifier_label: DocumentClassifierLabel | None
    classifier_confidence: Decimal | None
    extracted_fields_json: dict | None
    review_required: bool
    provider_name: str | None
    provider_model: str | None
    error_message: str | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class DocumentExtractionJobListResponse(BaseModel):
    items: list[DocumentExtractionJobResponse]


class ReconciliationSuggestionSetResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    bank_transaction_id: UUID
    generation_status: AIJobStatus
    generated_at: datetime | None
    source_summary_json: dict | None
    created_at: datetime
    updated_at: datetime


class AIJobResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    job_type: AIJobType
    target_entity_type: str
    target_entity_id: str
    status: AIJobStatus
    attempts: int
    error_message: str | None
    scheduled_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    payload_json: dict | None
    result_json: dict | None
    created_at: datetime
    updated_at: datetime


class AIJobListResponse(BaseModel):
    items: list[AIJobResponse]
