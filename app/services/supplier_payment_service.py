from sqlalchemy.orm import Session

from app.core.exceptions import not_found
from app.repositories.audit import AuditRepository
from app.repositories.supplier_payment_repository import SupplierPaymentRepository
from app.services.supplier_payment_allocation_service import SupplierPaymentAllocationService
from app.services.supplier_payment_posting_service import SupplierPaymentPostingService


class SupplierPaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.payments = SupplierPaymentRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, actor_user_id, payload):
        number = self.payments.next_number(organization_id)
        payment = self.payments.create(
            organization_id=organization_id,
            supplier_id=payload["supplier_id"],
            payment_number=number,
            payment_date=payload["payment_date"],
            currency_code=payload["currency_code"],
            amount=payload["amount"],
            unapplied_amount=payload["amount"],
            payment_method=payload.get("payment_method"),
            reference=payload.get("reference"),
            disbursement_account_id=payload.get("disbursement_account_id"),
            created_by_user_id=actor_user_id,
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="supplier_payment.created", entity_type="supplier_payment", entity_id=str(payment.id))
        self.db.commit()
        return payment

    def update(self, organization_id, payment_id, payload):
        payment = self.payments.get(organization_id, payment_id)
        if not payment:
            raise not_found("Supplier payment not found")
        for k, v in payload.items():
            setattr(payment, k, v)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def post(self, organization_id, payment_id, actor_user_id):
        return SupplierPaymentPostingService(self.db).post(organization_id, payment_id, actor_user_id)

    def allocate(self, organization_id, payment_id, bill_id, allocated_amount, allocation_date, actor_user_id):
        return SupplierPaymentAllocationService(self.db).allocate(organization_id, payment_id, bill_id, allocated_amount, allocation_date, actor_user_id)
