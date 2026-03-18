from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import BillStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.bill_repository import BillRepository
from app.repositories.supplier_payment_repository import SupplierPaymentRepository


class SupplierPaymentAllocationService:
    def __init__(self, db: Session):
        self.db = db
        self.payments = SupplierPaymentRepository(db)
        self.bills = BillRepository(db)
        self.audit = AuditRepository(db)

    def allocate(self, organization_id, payment_id, bill_id, allocated_amount, allocation_date, actor_user_id):
        payment = self.payments.get(organization_id, payment_id)
        if not payment:
            raise not_found("Supplier payment not found")
        bill = self.bills.get(organization_id, bill_id)
        if not bill:
            raise not_found("Bill not found")
        if str(payment.supplier_id) != str(bill.supplier_id):
            raise forbidden("Supplier mismatch between payment and bill")
        if Decimal(allocated_amount) > Decimal(payment.unapplied_amount):
            raise forbidden("Allocation exceeds payment unapplied amount")
        if Decimal(allocated_amount) > Decimal(bill.amount_due):
            raise forbidden("Allocation exceeds bill amount due")

        alloc = self.payments.allocate(
            organization_id=organization_id,
            supplier_payment_id=payment.id,
            bill_id=bill.id,
            supplier_credit_id=None,
            allocated_amount=allocated_amount,
            allocation_date=allocation_date,
        )
        payment.unapplied_amount = Decimal(payment.unapplied_amount) - Decimal(allocated_amount)
        bill.amount_paid = Decimal(bill.amount_paid) + Decimal(allocated_amount)
        bill.amount_due = Decimal(bill.total_amount) - Decimal(bill.amount_paid)
        if bill.amount_due == 0:
            bill.status = BillStatus.PAID
        elif bill.amount_paid > 0:
            bill.status = BillStatus.PARTIALLY_PAID
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="supplier_payment.allocated", entity_type="supplier_payment", entity_id=str(payment.id))
        self.db.commit()
        return alloc
