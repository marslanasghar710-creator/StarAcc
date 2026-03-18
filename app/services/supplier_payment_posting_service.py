from datetime import datetime, UTC
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import PaymentStatus
from app.core.exceptions import forbidden
from app.db.models import AccountingSettings
from app.repositories.audit import AuditRepository
from app.repositories.supplier_payment_repository import SupplierPaymentRepository
from app.services.journal_service import JournalService


class SupplierPaymentPostingService:
    def __init__(self, db: Session):
        self.db = db
        self.payments = SupplierPaymentRepository(db)
        self.audit = AuditRepository(db)

    def post(self, organization_id, payment_id, actor_user_id):
        payment = self.payments.get(organization_id, payment_id)
        if not payment:
            raise forbidden("Supplier payment not found")
        if payment.status != PaymentStatus.DRAFT:
            raise forbidden("Only draft supplier payments can be posted")
        settings = self.db.query(AccountingSettings).filter(AccountingSettings.organization_id == organization_id).first()
        if not settings or not settings.accounts_payable_control_account_id:
            raise forbidden("AP configuration missing")
        disbursement = payment.disbursement_account_id or settings.default_supplier_payments_account_id
        if not disbursement:
            raise forbidden("Disbursement account required")

        payload = {
            "entry_date": payment.payment_date,
            "description": f"Supplier payment {payment.payment_number}",
            "reference": payment.reference,
            "source_module": "accounts_payable",
            "source_type": "supplier_payment",
            "source_id": str(payment.id),
            "lines": [
                type("L", (), {"account_id": settings.accounts_payable_control_account_id, "description": "AP settlement", "debit_amount": Decimal(payment.amount), "credit_amount": Decimal("0"), "currency_code": payment.currency_code, "exchange_rate": payment.exchange_rate}),
                type("L", (), {"account_id": disbursement, "description": "Supplier payment", "debit_amount": Decimal("0"), "credit_amount": Decimal(payment.amount), "currency_code": payment.currency_code, "exchange_rate": payment.exchange_rate}),
            ],
        }
        journal = JournalService(self.db).create(organization_id, actor_user_id, payload)
        journal = JournalService(self.db).post(organization_id, journal.id, actor_user_id)
        payment.posted_journal_id = journal.id
        payment.posted_at = datetime.now(UTC)
        payment.status = PaymentStatus.POSTED
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="supplier_payment.posted", entity_type="supplier_payment", entity_id=str(payment.id))
        self.db.commit()
        return payment
