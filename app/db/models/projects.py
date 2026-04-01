import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import ProjectStatus
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class Project(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_project_org_code"),
        CheckConstraint("budget_revenue >= 0", name="ck_project_budget_revenue_non_negative"),
        CheckConstraint("budget_cost >= 0", name="ck_project_budget_cost_non_negative"),
        CheckConstraint("budget_hours >= 0", name="ck_project_budget_hours_non_negative"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True, index=True)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, name="project_status", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False, default=ProjectStatus.DRAFT)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    budget_revenue: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    budget_cost: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    budget_hours: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    currency_code: Mapped[str | None] = mapped_column(String(3), nullable=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ProjectCostEntry(Base, UUIDPKMixin):
    __tablename__ = "project_cost_entries"
    __table_args__ = (CheckConstraint("amount != 0", name="ck_project_cost_entry_amount_non_zero"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_entity_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_line_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reversal_of_entry_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("project_cost_entries.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ProjectRevenueEntry(Base, UUIDPKMixin):
    __tablename__ = "project_revenue_entries"
    __table_args__ = (CheckConstraint("amount != 0", name="ck_project_revenue_entry_amount_non_zero"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_entity_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_line_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reversal_of_entry_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("project_revenue_entries.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ProjectTimeEntry(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "project_time_entries"
    __table_args__ = (
        CheckConstraint("hours > 0", name="ck_project_time_entry_hours_positive"),
        CheckConstraint("cost_rate >= 0", name="ck_project_time_entry_cost_rate_non_negative"),
        CheckConstraint("billing_rate >= 0", name="ck_project_time_entry_billing_rate_non_negative"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    hours: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_billable: Mapped[bool] = mapped_column(nullable=False, default=True)
    cost_rate: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    billing_rate: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)


class ProjectStatusHistory(Base, UUIDPKMixin):
    __tablename__ = "project_status_history"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    from_status: Mapped[ProjectStatus | None] = mapped_column(Enum(ProjectStatus, name="project_status", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=True)
    to_status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, name="project_status", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    changed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
