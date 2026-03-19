from __future__ import annotations

from collections import OrderedDict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import ReportType
from app.repositories.report_repository import ReportRepository
from app.schemas.reporting import (
    AgedReceivableCustomerLineResponse,
    AgedReceivableInvoiceLineResponse,
    AgedReceivablesResponse,
    AgingBucketResponse,
    ReportFilterResponse,
    ReportMetadataResponse,
)
from app.services.reporting.common import bucket_name
from app.services.reporting.report_context_service import ReportContextService

ZERO = Decimal("0")
BUCKET_KEYS = ["current", "1_30_days", "31_60_days", "61_90_days", "over_90_days"]


class AgedReceivablesService:
    def __init__(self, db: Session):
        self.db = db
        self.reports = ReportRepository(db)
        self.contexts = ReportContextService(db)

    def generate(self, organization_id: str, query, generated_by_user_id: str | None) -> AgedReceivablesResponse:
        filters = query.model_dump(mode="json")
        context = self.contexts.build_context(
            report_type=ReportType.AGED_RECEIVABLES,
            organization_id=organization_id,
            generated_by_user_id=generated_by_user_id,
            accounting_basis=query.accounting_basis,
            filters=filters,
        )
        invoices, credits, payments = self.reports.list_open_receivable_documents(organization_id, query.as_of_date)
        customers: OrderedDict[str, dict] = OrderedDict()
        totals = {key: ZERO for key in BUCKET_KEYS}
        total_outstanding = ZERO
        unapplied_credits_total = ZERO
        unapplied_payments_total = ZERO
        for invoice, customer in invoices:
            key = str(customer.id)
            if key not in customers:
                customers[key] = {
                    "customer_id": customer.id,
                    "customer_name": customer.display_name,
                    "buckets": {bucket: ZERO for bucket in BUCKET_KEYS},
                    "invoice_lines": [],
                    "unapplied_credits": ZERO,
                    "unapplied_payments": ZERO,
                }
            bucket = bucket_name(query.as_of_date, invoice.due_date)
            amount = Decimal(invoice.amount_due)
            customers[key]["buckets"][bucket] += amount
            totals[bucket] += amount
            total_outstanding += amount
            if query.detailed:
                customers[key]["invoice_lines"].append(
                    AgedReceivableInvoiceLineResponse(
                        invoice_id=invoice.id,
                        invoice_number=invoice.invoice_number,
                        issue_date=invoice.issue_date,
                        due_date=invoice.due_date,
                        outstanding_amount=amount,
                        bucket=bucket,
                    )
                )
        for credit, customer in credits:
            key = str(customer.id)
            customers.setdefault(
                key,
                {"customer_id": customer.id, "customer_name": customer.display_name, "buckets": {bucket: ZERO for bucket in BUCKET_KEYS}, "invoice_lines": [], "unapplied_credits": ZERO, "unapplied_payments": ZERO},
            )
            amount = Decimal(credit.unapplied_amount)
            customers[key]["unapplied_credits"] += amount
            unapplied_credits_total += amount
        for payment, customer in payments:
            key = str(customer.id)
            customers.setdefault(
                key,
                {"customer_id": customer.id, "customer_name": customer.display_name, "buckets": {bucket: ZERO for bucket in BUCKET_KEYS}, "invoice_lines": [], "unapplied_credits": ZERO, "unapplied_payments": ZERO},
            )
            amount = Decimal(payment.unapplied_amount)
            customers[key]["unapplied_payments"] += amount
            unapplied_payments_total += amount
        customer_lines = [
            AgedReceivableCustomerLineResponse(
                customer_id=item["customer_id"],
                customer_name=item["customer_name"],
                buckets=AgingBucketResponse(**item["buckets"]),
                total_outstanding=sum(item["buckets"].values(), ZERO),
                invoice_lines=item["invoice_lines"] if query.detailed else [],
                unapplied_credits=item["unapplied_credits"],
                unapplied_payments=item["unapplied_payments"],
            )
            for item in customers.values()
        ]
        result = AgedReceivablesResponse(
            metadata=ReportMetadataResponse(
                report_type=ReportType.AGED_RECEIVABLES,
                organization_id=context.organization_id,
                organization_name=context.organization_name,
                base_currency=context.base_currency,
                generated_at=context.generated_at,
                generated_by_user_id=context.generated_by_user_id,
                accounting_basis=context.accounting_basis,
            ),
            filters=ReportFilterResponse(**filters),
            customers=customer_lines,
            totals=AgingBucketResponse(**totals),
            total_outstanding=total_outstanding,
            unapplied_credits_total=unapplied_credits_total,
            unapplied_payments_total=unapplied_payments_total,
        )
        row_count = sum(len(line.invoice_lines) or 1 for line in customer_lines)
        self.contexts.persist_generation(context=context, row_count=row_count)
        self.db.commit()
        return result
