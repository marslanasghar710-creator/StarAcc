from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone

from fastapi import HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.repositories.audit import AuditRepository

UTC = timezone.utc


class TaxExportService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditRepository(db)

    def export_summary(self, organization_id, actor_user_id, export_format: str, summary_payload: dict):
        ts = datetime.now(UTC)
        file_name = f"tax-summary-{ts.strftime('%Y%m%dT%H%M%SZ')}.{export_format}"
        if export_format == "json":
            content = json.dumps(summary_payload, default=str, indent=2)
            media_type = "application/json"
        elif export_format == "csv":
            buffer = io.StringIO()
            fieldnames = ["tax_code", "tax_code_name", "tax_rate_name_snapshot", "tax_rate_percentage_snapshot", "report_group", "direction", "net_amount", "tax_amount", "gross_amount"]
            writer = csv.DictWriter(buffer, fieldnames=fieldnames)
            writer.writeheader()
            for line in summary_payload["lines"]:
                writer.writerow({key: line.get(key) for key in fieldnames})
            content = buffer.getvalue()
            media_type = "text/csv"
        else:
            raise HTTPException(status_code=501, detail="PDF export scaffold is not implemented yet")
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="tax_summary.exported", entity_type="tax_summary", entity_id=None, metadata_json={"export_format": export_format, "filters": {k: summary_payload.get(k) for k in ["from_date", "to_date", "direction", "tax_code_id", "report_group"]}})
        self.db.commit()
        return Response(content=content, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{file_name}"'})
