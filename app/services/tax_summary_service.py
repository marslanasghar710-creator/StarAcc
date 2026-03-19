from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.audit import AuditRepository
from app.repositories.report_repository import ReportRepository
from app.repositories.tax_transaction_repository import TaxTransactionRepository

UTC = timezone.utc
ZERO = Decimal("0")


class TaxSummaryService:
    def __init__(self, db: Session):
        self.db = db
        self.transactions = TaxTransactionRepository(db)
        self.audit = AuditRepository(db)
        self.reports = ReportRepository(db)

    def summary(self, organization_id, actor_user_id, query):
        org = self.reports.get_organization(organization_id)
        rows = self.transactions.summary(
            organization_id,
            from_date=query.from_date,
            to_date=query.to_date,
            direction=query.direction,
            tax_code_id=query.tax_code_id,
            report_group=query.report_group,
        )
        lines = []
        total_net = total_tax = total_gross = ZERO
        for row in rows:
            net = Decimal(row.net_amount)
            tax = Decimal(row.tax_amount)
            gross = Decimal(row.gross_amount)
            total_net += net
            total_tax += tax
            total_gross += gross
            lines.append({
                "tax_code_id": row.tax_code_id,
                "tax_code": row.tax_code,
                "tax_code_name": row.tax_code_name,
                "tax_rate_name_snapshot": row.tax_rate_name_snapshot,
                "tax_rate_percentage_snapshot": row.tax_rate_percentage_snapshot,
                "report_group": row.report_group,
                "direction": row.direction,
                "net_amount": net,
                "tax_amount": tax,
                "gross_amount": gross,
            })
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="tax_summary.generated", entity_type="tax_summary", entity_id=None, metadata_json=query.model_dump(mode="json"))
        self.db.commit()
        return {
            "organization_id": org.id,
            "organization_name": org.name,
            "generated_at": datetime.now(UTC),
            "from_date": query.from_date,
            "to_date": query.to_date,
            "direction": query.direction,
            "tax_code_id": query.tax_code_id,
            "report_group": query.report_group,
            "lines": lines,
            "total_net_amount": total_net,
            "total_tax_amount": total_tax,
            "total_gross_amount": total_gross,
        }
