from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.customer_repository import CustomerRepository
from app.repositories.credit_note_repository import CreditNoteRepository
from app.repositories.customer_payment_repository import CustomerPaymentRepository
from app.repositories.invoice_repository import InvoiceRepository


class ARQueryService:
    def __init__(self, db: Session):
        self.db = db
        self.customers = CustomerRepository(db)
        self.invoices = InvoiceRepository(db)
        self.credit_notes = CreditNoteRepository(db)
        self.payments = CustomerPaymentRepository(db)

    def open_items(self, organization_id):
        res = []
        for i in self.invoices.list(organization_id):
            if i.amount_due > 0 and i.posted_journal_id:
                res.append({"document_id": i.id, "document_type": "invoice", "customer_id": i.customer_id, "document_number": i.invoice_number, "issue_date": i.issue_date, "due_date": i.due_date, "amount_due": i.amount_due})
        for c in self.credit_notes.list(organization_id):
            if c.unapplied_amount > 0 and c.posted_journal_id:
                res.append({"document_id": c.id, "document_type": "credit_note", "customer_id": c.customer_id, "document_number": c.credit_note_number, "issue_date": c.issue_date, "due_date": None, "amount_due": -c.unapplied_amount})
        for p in self.payments.list(organization_id):
            if p.unapplied_amount > 0 and p.posted_journal_id:
                res.append({"document_id": p.id, "document_type": "payment", "customer_id": p.customer_id, "document_number": p.payment_number, "issue_date": p.payment_date, "due_date": None, "amount_due": -p.unapplied_amount})
        return res

    def aging(self, organization_id, as_of: date):
        buckets = {"current": Decimal("0"), "1_30_days": Decimal("0"), "31_60_days": Decimal("0"), "61_90_days": Decimal("0"), "over_90_days": Decimal("0")}
        for i in self.invoices.list(organization_id):
            if not i.posted_journal_id or i.amount_due <= 0:
                continue
            days = (as_of - i.due_date).days
            amt = Decimal(i.amount_due)
            if days <= 0:
                buckets["current"] += amt
            elif days <= 30:
                buckets["1_30_days"] += amt
            elif days <= 60:
                buckets["31_60_days"] += amt
            elif days <= 90:
                buckets["61_90_days"] += amt
            else:
                buckets["over_90_days"] += amt
        return [{"bucket": k, "amount": v} for k, v in buckets.items()]

    def customer_summary(self, organization_id):
        out = []
        for c in self.customers.list(organization_id):
            outstanding = sum((Decimal(i.amount_due) for i in self.invoices.list(organization_id) if str(i.customer_id) == str(c.id)), Decimal("0"))
            out.append({"customer_id": c.id, "customer_name": c.display_name, "total_outstanding": outstanding})
        return out
