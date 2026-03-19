from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.enums import NotificationType, ReportExportFormat
from app.services.notification_preference_service import NotificationPreferenceService
from app.services.notification_service import NotificationService
from app.services.reporting.report_context_service import ReportContextService


class ReportExportService:
    def __init__(self, db: Session):
        self.db = db
        self.contexts = ReportContextService(db)
        self.notification_preferences = NotificationPreferenceService(db)
        self.notifications = NotificationService(db)

    def _normalize_value(self, value: Any) -> str:
        if isinstance(value, dict):
            return json.dumps(value, default=str, sort_keys=True)
        if isinstance(value, list):
            return json.dumps(value, default=str)
        return "" if value is None else str(value)

    def _flatten(self, payload: Any, prefix: str = "") -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        if isinstance(payload, list):
            for item in payload:
                rows.extend(self._flatten(item, prefix=prefix))
            return rows
        if isinstance(payload, dict):
            base = {}
            nested_lists = []
            for key, value in payload.items():
                full_key = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"
                if isinstance(value, dict):
                    for sub_key, sub_value in self._flatten(value, prefix=full_key)[0].items():
                        base[sub_key] = sub_value
                elif isinstance(value, list):
                    nested_lists.append((full_key, value))
                else:
                    base[full_key] = self._normalize_value(value)
            if not nested_lists:
                return [base]
            for list_key, items in nested_lists:
                if not items:
                    rows.append(base | {list_key: "[]"})
                elif all(isinstance(item, dict) for item in items):
                    for item in items:
                        for flattened in self._flatten(item, prefix=list_key):
                            rows.append(base | flattened)
                else:
                    rows.append(base | {list_key: self._normalize_value(items)})
            return rows or [base]
        return [{prefix or "value": self._normalize_value(payload)}]

    def export(self, *, organization_id: str, report_type, export_format: ReportExportFormat, file_stem: str, payload: Any, generated_by_user_id: str | None):
        serialized = payload.model_dump(mode="json") if hasattr(payload, "model_dump") else payload
        generated_at = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        file_name = f"{file_stem}-{generated_at}.{export_format.value}"
        context = self.contexts.build_context(
            report_type=report_type,
            organization_id=organization_id,
            generated_by_user_id=generated_by_user_id,
            accounting_basis=serialized.get("metadata", {}).get("accounting_basis", "accrual"),
            filters=serialized.get("filters", {}),
        )
        run = self.contexts.persist_generation(context=context, row_count=len(self._flatten(serialized)), export_format=export_format)
        if export_format == ReportExportFormat.JSON:
            content = json.dumps(serialized, default=str, indent=2)
            media_type = "application/json"
        elif export_format == ReportExportFormat.CSV:
            buffer = io.StringIO()
            rows = self._flatten(serialized)
            fieldnames = sorted({key for row in rows for key in row.keys()})
            writer = csv.DictWriter(buffer, fieldnames=fieldnames)
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
            content = buffer.getvalue()
            media_type = "text/csv"
        else:
            raise HTTPException(status_code=501, detail="PDF export scaffold is not implemented yet")
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
