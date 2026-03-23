import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import AccountType, ReportExportFormat, ReportRunStatus, ReportType
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class ReportRun(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "report_runs"
    __table_args__ = (
        Index("ix_report_runs_org_report_generated", "organization_id", "report_type", "generated_at"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    report_type: Mapped[ReportType] = mapped_column(Enum(ReportType, name="report_type"), nullable=False)
    parameters_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    generated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[ReportRunStatus] = mapped_column(Enum(ReportRunStatus, name="report_run_status"), nullable=False, default=ReportRunStatus.COMPLETED)
    row_count: Mapped[int | None] = mapped_column(nullable=True)
    export_format: Mapped[ReportExportFormat | None] = mapped_column(Enum(ReportExportFormat, name="report_export_format"), nullable=True)


class ReportExport(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "report_exports"
    __table_args__ = (
        Index("ix_report_exports_org_report_generated", "organization_id", "report_type", "generated_at"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    report_run_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("report_runs.id"), nullable=True, index=True)
    report_type: Mapped[ReportType] = mapped_column(Enum(ReportType, name="report_type"), nullable=False)
    export_format: Mapped[ReportExportFormat] = mapped_column(Enum(ReportExportFormat, name="report_export_format"), nullable=False)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    generated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ConsolidationGroup(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "consolidation_groups"
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_consolidation_group_org_name"),
        Index("ix_consolidation_groups_org_updated", "organization_id", "updated_at"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    reporting_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)


class GroupEntity(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "group_entities"
    __table_args__ = (
        UniqueConstraint("group_id", "organization_id", name="uq_group_entity_group_org"),
        Index("ix_group_entities_group_created", "group_id", "created_at"),
    )

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("consolidation_groups.id"), nullable=False, index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    ownership_percentage: Mapped[Decimal | None] = mapped_column(Numeric(9, 4), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class ConsolidationRun(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "consolidation_runs"
    __table_args__ = (
        Index("ix_consolidation_runs_group_created", "group_id", "created_at"),
    )

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("consolidation_groups.id"), nullable=False, index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[ReportRunStatus] = mapped_column(Enum(ReportRunStatus, name="consolidation_run_status"), nullable=False, default=ReportRunStatus.PENDING)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    selected_entity_ids_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    fx_rates_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    report_snapshot_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    elimination_summary_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class EliminationEntry(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "elimination_entries"
    __table_args__ = (
        Index("ix_elimination_entries_group_created", "group_id", "created_at"),
        Index("ix_elimination_entries_group_run_created", "group_id", "consolidation_run_id", "created_at"),
    )

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("consolidation_groups.id"), nullable=False, index=True)
    consolidation_run_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("consolidation_runs.id"), nullable=True, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    source_entities_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    journal_lines_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_manual: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
