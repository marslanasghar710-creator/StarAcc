from __future__ import annotations

from collections import OrderedDict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import ReportType
from app.repositories.report_repository import ReportRepository
from app.schemas.reporting import (
    AgedPayableBillLineResponse,
    AgedPayableSupplierLineResponse,
    AgedPayablesResponse,
    AgingBucketResponse,
    ReportFilterResponse,
    ReportMetadataResponse,
)
from app.services.reporting.common import bucket_name
from app.services.reporting.report_context_service import ReportContextService

ZERO = Decimal("0")
BUCKET_KEYS = ["current", "1_30_days", "31_60_days", "61_90_days", "over_90_days"]


class AgedPayablesService:
    def __init__(self, db: Session):
        self.db = db
        self.reports = ReportRepository(db)
        self.contexts = ReportContextService(db)

    def generate(self, organization_id: str, query, generated_by_user_id: str | None) -> AgedPayablesResponse:
        filters = query.model_dump(mode="json")
        context = self.contexts.build_context(
            report_type=ReportType.AGED_PAYABLES,
            organization_id=organization_id,
            generated_by_user_id=generated_by_user_id,
            accounting_basis=query.accounting_basis,
            filters=filters,
        )
        bills, credits, payments = self.reports.list_open_payable_documents(organization_id, query.as_of_date)
        suppliers: OrderedDict[str, dict] = OrderedDict()
        totals = {key: ZERO for key in BUCKET_KEYS}
        total_outstanding = ZERO
        unapplied_credits_total = ZERO
        unapplied_payments_total = ZERO
        for bill, supplier in bills:
            key = str(supplier.id)
            if key not in suppliers:
                suppliers[key] = {
                    "supplier_id": supplier.id,
                    "supplier_name": supplier.display_name,
                    "buckets": {bucket: ZERO for bucket in BUCKET_KEYS},
                    "bill_lines": [],
                    "unapplied_credits": ZERO,
                    "unapplied_payments": ZERO,
                }
            bucket = bucket_name(query.as_of_date, bill.due_date)
            amount = Decimal(bill.amount_due)
            suppliers[key]["buckets"][bucket] += amount
            totals[bucket] += amount
            total_outstanding += amount
            if query.detailed:
                suppliers[key]["bill_lines"].append(
                    AgedPayableBillLineResponse(
                        bill_id=bill.id,
                        bill_number=bill.bill_number,
                        issue_date=bill.issue_date,
                        due_date=bill.due_date,
                        outstanding_amount=amount,
                        bucket=bucket,
                    )
                )
        for credit, supplier in credits:
            key = str(supplier.id)
            suppliers.setdefault(
                key,
                {"supplier_id": supplier.id, "supplier_name": supplier.display_name, "buckets": {bucket: ZERO for bucket in BUCKET_KEYS}, "bill_lines": [], "unapplied_credits": ZERO, "unapplied_payments": ZERO},
            )
            amount = Decimal(credit.unapplied_amount)
            suppliers[key]["unapplied_credits"] += amount
            unapplied_credits_total += amount
        for payment, supplier in payments:
            key = str(supplier.id)
            suppliers.setdefault(
                key,
                {"supplier_id": supplier.id, "supplier_name": supplier.display_name, "buckets": {bucket: ZERO for bucket in BUCKET_KEYS}, "bill_lines": [], "unapplied_credits": ZERO, "unapplied_payments": ZERO},
            )
            amount = Decimal(payment.unapplied_amount)
            suppliers[key]["unapplied_payments"] += amount
            unapplied_payments_total += amount
        supplier_lines = [
            AgedPayableSupplierLineResponse(
                supplier_id=item["supplier_id"],
                supplier_name=item["supplier_name"],
                buckets=AgingBucketResponse(**item["buckets"]),
                total_outstanding=sum(item["buckets"].values(), ZERO),
                bill_lines=item["bill_lines"] if query.detailed else [],
                unapplied_credits=item["unapplied_credits"],
                unapplied_payments=item["unapplied_payments"],
            )
            for item in suppliers.values()
        ]
        result = AgedPayablesResponse(
            metadata=ReportMetadataResponse(
                report_type=ReportType.AGED_PAYABLES,
                organization_id=context.organization_id,
                organization_name=context.organization_name,
                base_currency=context.base_currency,
                generated_at=context.generated_at,
                generated_by_user_id=context.generated_by_user_id,
                accounting_basis=context.accounting_basis,
            ),
            filters=ReportFilterResponse(**filters),
            suppliers=supplier_lines,
            totals=AgingBucketResponse(**totals),
            total_outstanding=total_outstanding,
            unapplied_credits_total=unapplied_credits_total,
            unapplied_payments_total=unapplied_payments_total,
        )
        row_count = sum(len(line.bill_lines) or 1 for line in supplier_lines)
        self.contexts.persist_generation(context=context, row_count=row_count)
        self.db.commit()
        return result
