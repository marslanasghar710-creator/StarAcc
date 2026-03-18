from sqlalchemy.orm import Session

from app.core.exceptions import not_found
from app.repositories.audit import AuditRepository
from app.repositories.customer_payment_repository import CustomerPaymentRepository
from app.services.customer_payment_posting_service import CustomerPaymentPostingService
from app.services.payment_allocation_service import PaymentAllocationService


class CustomerPaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.payments = CustomerPaymentRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, actor_user_id, payload):
        number = self.payments.next_number(organization_id)
        payment = self.payments.create(
            organization_id=organization_id,
            customer_id=payload["customer_id"],
            payment_number=number,
            payment_date=payload["payment_date"],
            currency_code=payload["currency_code"],
            amount=payload["amount"],
            unapplied_amount=payload["amount"],
            payment_method=payload.get("payment_method"),
            reference=payload.get("reference"),
            deposit_account_id=payload.get("deposit_account_id"),
            created_by_user_id=actor_user_id,
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payment.created", entity_type="customer_payment", entity_id=str(payment.id))
        self.db.commit()
        return payment

    def update(self, organization_id, payment_id, payload):
        payment = self.payments.get(organization_id, payment_id)
        if not payment:
            raise not_found("Payment not found")
        for k, v in payload.items():
            setattr(payment, k, v)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def post(self, organization_id, payment_id, actor_user_id):
        return CustomerPaymentPostingService(self.db).post(organization_id, payment_id, actor_user_id)

    def allocate(self, organization_id, payment_id, invoice_id, allocated_amount, allocation_date, actor_user_id):
        return PaymentAllocationService(self.db).allocate(organization_id, payment_id, invoice_id, allocated_amount, allocation_date, actor_user_id)
