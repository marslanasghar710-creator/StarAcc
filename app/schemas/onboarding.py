from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.enums import OnboardingPath, OnboardingPersona, OnboardingTaskStatus


class OnboardingTaskResponse(BaseModel):
    key: str
    title: str
    description: str
    stage: str
    required: bool
    status: OnboardingTaskStatus
    blocked: bool
    depends_on: list[str]
    route: str | None = None
    persona_priority: bool = False
    permissions: list[str]


class OnboardingStatusResponse(BaseModel):
    organization_id: UUID
    path: OnboardingPath | None = None
    persona: OnboardingPersona | None = None
    current_step: str | None = None
    progress_percent: int
    completion_tier: int
    readiness: dict[str, bool | int]
    tasks: list[OnboardingTaskResponse]
    next_recommended_action: dict | None = None
    dismissed_prompts: list[str]
    is_demo_org: bool


class OnboardingPathSelectRequest(BaseModel):
    path: OnboardingPath


class OnboardingPersonaSelectRequest(BaseModel):
    persona: OnboardingPersona


class OnboardingTaskUpdateRequest(BaseModel):
    status: OnboardingTaskStatus


class OnboardingResumeRequest(BaseModel):
    source: str | None = None


class OnboardingResumeResponse(BaseModel):
    resume_to: str
    status: OnboardingStatusResponse


class UserOnboardingProfileResponse(BaseModel):
    user_id: UUID
    organization_id: UUID
    started_at: datetime | None = None
