from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import ReportExportFormat, ReportType
from app.db.models import ReportExport

UTC = timezone.utc


class ReportExportRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        organization_id: str | UUID,
        report_run_id: str | UUID | None,
        report_type: ReportType,
        export_format: ReportExportFormat,
        generated_by_user_id: str | UUID | None,
        file_name: str | None = None,
        storage_path: str | None = None,
    ) -> ReportExport:
        report_export = ReportExport(
            organization_id=organization_id,
            report_run_id=report_run_id,
            report_type=report_type,
            export_format=export_format,
            file_name=file_name,
            storage_path=storage_path,
            generated_by_user_id=generated_by_user_id,
            generated_at=datetime.now(UTC),
        )
        self.db.add(report_export)
        self.db.flush()
        return report_export

    def list_for_org(self, organization_id: str | UUID, *, limit: int = 50, offset: int = 0) -> list[ReportExport]:
        query = select(ReportExport).where(ReportExport.organization_id == organization_id).order_by(ReportExport.generated_at.desc()).limit(limit).offset(offset)
        return list(self.db.scalars(query).all())

    def count_for_org(self, organization_id: str | UUID) -> int:
        return int(self.db.scalar(select(func.count()).select_from(ReportExport).where(ReportExport.organization_id == organization_id)) or 0)

    def get(self, organization_id: str | UUID, export_id: str | UUID) -> ReportExport | None:
        return self.db.scalar(select(ReportExport).where(ReportExport.organization_id == organization_id, ReportExport.id == export_id))
