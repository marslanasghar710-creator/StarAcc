from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.bill_repository import BillRepository
from app.repositories.supplier_credit_repository import SupplierCreditRepository
from app.repositories.supplier_payment_repository import SupplierPaymentRepository
from app.repositories.supplier_repository import SupplierRepository


class APQueryService:
    def __init__(self, db: Session):
        self.db = db
        self.suppliers = SupplierRepository(db)
        self.bills = BillRepository(db)
        self.supplier_credits = SupplierCreditRepository(db)
        self.supplier_payments = SupplierPaymentRepository(db)

    def open_items(self, organization_id):
        out = []
        for b in self.bills.list(organization_id):
            if b.amount_due > 0 and b.posted_journal_id:
                out.append({"document_id": b.id, "document_type": "bill", "supplier_id": b.supplier_id, "document_number": b.bill_number, "issue_date": b.issue_date, "due_date": b.due_date, "amount_due": b.amount_due})
        for c in self.supplier_credits.list(organization_id):
            if c.unapplied_amount > 0 and c.posted_journal_id:
                out.append({"document_id": c.id, "document_type": "supplier_credit", "supplier_id": c.supplier_id, "document_number": c.supplier_credit_number, "issue_date": c.issue_date, "due_date": None, "amount_due": -c.unapplied_amount})
        for p in self.supplier_payments.list(organization_id):
            if p.unapplied_amount > 0 and p.posted_journal_id:
                out.append({"document_id": p.id, "document_type": "supplier_payment", "supplier_id": p.supplier_id, "document_number": p.payment_number, "issue_date": p.payment_date, "due_date": None, "amount_due": -p.unapplied_amount})
        return out

    def aging(self, organization_id, as_of: date):
        buckets = {"current": Decimal("0"), "1_30_days": Decimal("0"), "31_60_days": Decimal("0"), "61_90_days": Decimal("0"), "over_90_days": Decimal("0")}
        for b in self.bills.list(organization_id):
            if not b.posted_journal_id or b.amount_due <= 0:
                continue
            days = (as_of - b.due_date).days
            amt = Decimal(b.amount_due)
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

    def supplier_summary(self, organization_id):
        out = []
        bills = self.bills.list(organization_id)
        for s in self.suppliers.list(organization_id):
            outstanding = sum((Decimal(b.amount_due) for b in bills if str(b.supplier_id) == str(s.id)), Decimal("0"))
            out.append({"supplier_id": s.id, "supplier_name": s.display_name, "total_outstanding": outstanding})
        return out
