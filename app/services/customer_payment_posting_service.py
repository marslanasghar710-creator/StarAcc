from datetime import datetime, UTC
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import PaymentStatus
from app.core.exceptions import forbidden
from app.db.models import AccountingSettings
from app.repositories.audit import AuditRepository
from app.repositories.customer_payment_repository import CustomerPaymentRepository
from app.services.journal_service import JournalService


class CustomerPaymentPostingService:
    def __init__(self, db: Session):
        self.db = db
        self.payments = CustomerPaymentRepository(db)
        self.audit = AuditRepository(db)

    def post(self, organization_id, payment_id, actor_user_id):
        payment = self.payments.get(organization_id, payment_id)
        if not payment:
            raise forbidden("Payment not found")
        if payment.status != PaymentStatus.DRAFT:
            raise forbidden("Only draft payments can be posted")
        settings = self.db.query(AccountingSettings).filter(AccountingSettings.organization_id == organization_id).first()
        if not settings:
            raise forbidden("Accounting settings missing")
        deposit = payment.deposit_account_id or settings.default_customer_receipts_account_id
        if not deposit:
            raise forbidden("Deposit/receipts account required")

        payload = {
            "entry_date": payment.payment_date,
            "description": f"Customer payment {payment.payment_number}",
            "reference": payment.reference,
            "source_module": "accounts_receivable",
            "source_type": "customer_payment",
            "source_id": str(payment.id),
            "lines": [
                type("L", (), {"account_id": deposit, "description": "Customer payment", "debit_amount": Decimal(payment.amount), "credit_amount": Decimal("0"), "currency_code": payment.currency_code, "exchange_rate": payment.exchange_rate}),
                type("L", (), {"account_id": settings.accounts_receivable_control_account_id, "description": "AR settlement", "debit_amount": Decimal("0"), "credit_amount": Decimal(payment.amount), "currency_code": payment.currency_code, "exchange_rate": payment.exchange_rate}),
            ],
        }
        journal = JournalService(self.db).create(organization_id, actor_user_id, payload)
        journal = JournalService(self.db).post(organization_id, journal.id, actor_user_id)
        payment.posted_journal_id = journal.id
        payment.posted_at = datetime.now(UTC)
        payment.status = PaymentStatus.POSTED
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payment.posted", entity_type="customer_payment", entity_id=str(payment.id))
        self.db.commit()
        return payment
