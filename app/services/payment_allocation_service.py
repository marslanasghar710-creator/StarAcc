from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import InvoiceStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.customer_payment_repository import CustomerPaymentRepository
from app.repositories.invoice_repository import InvoiceRepository


class PaymentAllocationService:
    def __init__(self, db: Session):
        self.db = db
        self.payments = CustomerPaymentRepository(db)
        self.invoices = InvoiceRepository(db)
        self.audit = AuditRepository(db)

    def allocate(self, organization_id, payment_id, invoice_id, allocated_amount, allocation_date, actor_user_id):
        payment = self.payments.get(organization_id, payment_id)
        if not payment:
            raise not_found("Payment not found")
        invoice = self.invoices.get(organization_id, invoice_id)
        if not invoice:
            raise not_found("Invoice not found")
        if str(payment.customer_id) != str(invoice.customer_id):
            raise forbidden("Payment and invoice customer mismatch")
        if Decimal(allocated_amount) > Decimal(payment.unapplied_amount):
            raise forbidden("Allocation exceeds payment unapplied amount")
        if Decimal(allocated_amount) > Decimal(invoice.amount_due):
            raise forbidden("Allocation exceeds invoice amount due")

        alloc = self.payments.allocate(
            organization_id=organization_id,
            customer_payment_id=payment.id,
            invoice_id=invoice.id,
            credit_note_id=None,
            allocated_amount=allocated_amount,
            allocation_date=allocation_date,
        )
        payment.unapplied_amount = Decimal(payment.unapplied_amount) - Decimal(allocated_amount)
        invoice.amount_paid = Decimal(invoice.amount_paid) + Decimal(allocated_amount)
        invoice.amount_due = Decimal(invoice.total_amount) - Decimal(invoice.amount_paid)
        if invoice.amount_due == 0:
            invoice.status = InvoiceStatus.PAID
        elif invoice.amount_paid > 0:
            invoice.status = InvoiceStatus.PARTIALLY_PAID
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payment.allocated", entity_type="customer_payment", entity_id=str(payment.id))
        self.db.commit()
        return alloc
