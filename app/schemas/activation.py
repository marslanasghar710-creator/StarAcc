from datetime import datetime
from pydantic import BaseModel, Field


ActivationItemStatus = str
ActivationCompletionSource = str


class ActivationChecklistItemState(BaseModel):
    item_id: str
    version: str
    status: ActivationItemStatus
    completed_at: datetime | None = None
    completion_source: ActivationCompletionSource | None = None
    blocking_reasons: list[str] = Field(default_factory=list)
    evidence: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class ActivationMilestones(BaseModel):
    initial_setup_complete: bool
    first_transaction_workflow_started: bool
    first_operational_record_created: bool
    first_financial_review_completed: bool


class ActivationChecklistSnapshot(BaseModel):
    org_id: str
    workspace_id: str | None = None
    checklist_version: str
    status: str
    completion_percent: int = Field(ge=0, le=100)
    completed_item_count: int = Field(ge=0)
    total_visible_item_count: int = Field(ge=0)
    required_completed_count: int = Field(ge=0)
    required_total_count: int = Field(ge=0)
    items: list[ActivationChecklistItemState]
    milestones: ActivationMilestones
    recommended_next_item_ids: list[str]
    activated_at: datetime | None = None
    first_entered_activation_at: datetime | None = None
    last_evaluated_at: datetime


class ActivationPresentationPreferences(BaseModel):
    org_id: str
    user_id: str
    checklist_dismissed: bool = False
    checklist_dismissed_at: datetime | None = None
    app_banner_dismissed: bool = False
    app_banner_dismissed_at: datetime | None = None
    last_viewed_at: datetime | None = None
    preferred_surface: str = "panel"


class ActivationSnapshotResponse(BaseModel):
    snapshot: ActivationChecklistSnapshot
    presentation_preferences: ActivationPresentationPreferences | None = None


class ConfirmSettingsReviewedRequest(BaseModel):
    org_id: str | None = None


class UpdateActivationPresentationPreferencesRequest(BaseModel):
    checklist_dismissed: bool | None = None
    app_banner_dismissed: bool | None = None
    preferred_surface: str | None = None
