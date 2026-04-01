import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import OnboardingPath, OnboardingPersona, OnboardingTaskStatus
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class UserOnboardingProfile(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "user_onboarding_profiles"
    __table_args__ = (UniqueConstraint("user_id", "organization_id", name="uq_user_onboarding_profile"),)

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    selected_path: Mapped[OnboardingPath | None] = mapped_column(
        Enum(OnboardingPath, name="onboarding_path"), nullable=True
    )
    selected_persona: Mapped[OnboardingPersona | None] = mapped_column(
        Enum(OnboardingPersona, name="onboarding_persona"), nullable=True
    )
    current_step_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completion_tier: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_meaningful_action_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dismissed_prompts: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    last_resume_context: Mapped[str | None] = mapped_column(String(120), nullable=True)


class OnboardingTaskProgress(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "onboarding_task_progress"
    __table_args__ = (UniqueConstraint("user_id", "organization_id", "task_key", name="uq_onboarding_task_progress"),)

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    task_key: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[OnboardingTaskStatus] = mapped_column(
        Enum(OnboardingTaskStatus, name="onboarding_task_status"), nullable=False, default=OnboardingTaskStatus.PENDING
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    skipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class OrgOnboardingStatus(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "org_onboarding_status"
    __table_args__ = (UniqueConstraint("organization_id", name="uq_org_onboarding_status_org"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    basics_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    accounting_config_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    operations_ready: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    first_transaction_recorded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    first_report_viewed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    first_export_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    completion_tier: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    readiness_cache: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
