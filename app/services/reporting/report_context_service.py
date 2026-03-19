from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.core.enums import ReportExportFormat, ReportRunStatus, ReportType
from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.membership import MembershipRepository
from app.repositories.report_export_repository import ReportExportRepository
from app.repositories.report_repository import ReportRepository

UTC = timezone.utc


@dataclass(slots=True)
class ReportContext:
    report_type: ReportType
    organization_id: str
    organization_name: str
    base_currency: str
    generated_at: datetime
    generated_by_user_id: str | None
    accounting_basis: str
    filters: dict


class ReportContextService:
    def __init__(self, db: Session):
        self.db = db
        self.reports = ReportRepository(db)
        self.report_exports = ReportExportRepository(db)
        self.memberships = MembershipRepository(db)
        self.audit = AuditRepository(db)

    def build_context(self, *, report_type: ReportType, organization_id: str, generated_by_user_id: str | None, accounting_basis: str, filters: dict) -> ReportContext:
        organization = self.reports.get_organization(organization_id)
        if not organization:
            raise not_found("Organization not found")
        return ReportContext(
            report_type=report_type,
            organization_id=str(organization.id),
            organization_name=organization.name,
            base_currency=organization.base_currency,
            generated_at=datetime.now(UTC),
            generated_by_user_id=str(generated_by_user_id) if generated_by_user_id else None,
            accounting_basis=accounting_basis,
            filters=filters,
        )

    def persist_generation(self, *, context: ReportContext, row_count: int, export_format: ReportExportFormat | None = None):
        report_run = self.reports.create_report_run(
            organization_id=context.organization_id,
            report_type=context.report_type,
            parameters_json=context.filters,
            generated_by_user_id=context.generated_by_user_id,
            status=ReportRunStatus.COMPLETED,
            row_count=row_count,
            export_format=export_format,
        )
        self.audit.create(
            organization_id=context.organization_id,
            actor_user_id=context.generated_by_user_id,
            action="report.generated",
            entity_type="report_run",
            entity_id=str(report_run.id),
            metadata_json={"report_type": context.report_type.value, "filters": context.filters, "export_format": export_format.value if export_format else None},
        )
        return report_run

    def persist_export(self, *, context: ReportContext, report_run_id, export_format: ReportExportFormat, file_name: str):
        export_row = self.report_exports.create(
            organization_id=context.organization_id,
            report_run_id=report_run_id,
            report_type=context.report_type,
            export_format=export_format,
            generated_by_user_id=context.generated_by_user_id,
            file_name=file_name,
            storage_path=None,
        )
        self.audit.create(
            organization_id=context.organization_id,
            actor_user_id=context.generated_by_user_id,
            action="report.exported",
            entity_type="report_export",
            entity_id=str(export_row.id),
            metadata_json={"report_type": context.report_type.value, "filters": context.filters, "export_format": export_format.value},
        )
        return export_row

    def list_runs(self, organization_id: str):
        return self.reports.list_report_runs(organization_id)

    def get_run(self, organization_id: str, report_run_id: str):
        report_run = self.reports.get_report_run(organization_id, report_run_id)
        if not report_run:
            raise not_found("Report run not found")
        return report_run

    def list_exports(self, organization_id: str):
        return self.report_exports.list_for_org(organization_id)

    def get_export(self, organization_id: str, export_id: str):
        export_row = self.report_exports.get(organization_id, export_id)
        if not export_row:
            raise not_found("Report export not found")
        return export_row
