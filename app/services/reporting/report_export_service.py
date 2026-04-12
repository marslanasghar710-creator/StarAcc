from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from typing import Any

from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.enums import NotificationType, ReportExportFormat
from app.services.notification_preference_service import NotificationPreferenceService
from app.services.notification_service import NotificationService
from app.services.entitlements_service import EntitlementsService
from app.services.reporting.export_renderers import flatten_payload, render_report_pdf, render_report_xlsx
from app.services.reporting.report_context_service import ReportContextService


class ReportExportService:
    def __init__(self, db: Session):
        self.db = db
        self.contexts = ReportContextService(db)
        self.notification_preferences = NotificationPreferenceService(db)
        self.notifications = NotificationService(db)

    def export(self, *, organization_id: str, report_type, export_format: ReportExportFormat, file_stem: str, payload: Any, generated_by_user_id: str | None):
        serialized = payload.model_dump(mode="json") if hasattr(payload, "model_dump") else payload
        generated_at = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        file_name = f"{file_stem}-{generated_at}.{export_format.value}"
        if export_format in {ReportExportFormat.PDF, ReportExportFormat.XLSX}:
            EntitlementsService(self.db).enforce_feature(organization_id, "advanced_exports")
        rows = flatten_payload(serialized)
        context = self.contexts.build_context(
            report_type=report_type,
            organization_id=organization_id,
            generated_by_user_id=generated_by_user_id,
            accounting_basis=serialized.get("metadata", {}).get("accounting_basis", "accrual"),
            filters=serialized.get("filters", {}),
        )
        run = self.contexts.persist_generation(context=context, row_count=len(rows), export_format=export_format)
        if export_format == ReportExportFormat.JSON:
            content: str | bytes = json.dumps(serialized, default=str, indent=2)
            media_type = "application/json"
        elif export_format == ReportExportFormat.CSV:
            buffer = io.StringIO()
            fieldnames = sorted({key for row in rows for key in row.keys()})
            writer = csv.DictWriter(buffer, fieldnames=fieldnames)
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
            content = buffer.getvalue()
            media_type = "text/csv"
        elif export_format == ReportExportFormat.PDF:
            title = report_type.value.replace("_", " ").title()
            content = render_report_pdf(title=title, payload=serialized)
            media_type = "application/pdf"
        else:
            content = render_report_xlsx(serialized)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        self.contexts.persist_export(context=context, report_run_id=run.id, export_format=export_format, file_name=file_name)
        if generated_by_user_id and self.notification_preferences.get_or_create_org(organization_id).report_export_notifications_enabled:
            self.notifications.maybe_create_event(
                organization_id,
                generated_by_user_id,
                user_id=generated_by_user_id,
                event_category="report",
                notification_type=NotificationType.REPORT_EXPORT_READY,
                title="Report export ready",
                message=f"{report_type.value} export {file_name} is ready.",
                entity_type="report_export",
                entity_id=str(run.id),
            )
        self.db.commit()
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
        )
