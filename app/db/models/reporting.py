import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import ReportExportFormat, ReportRunStatus, ReportType
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
