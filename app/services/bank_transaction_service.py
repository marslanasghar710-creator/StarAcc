from datetime import datetime, timezone

UTC = timezone.utc
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import BankTransactionStatus, JournalStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.bank_account_repository import BankAccountRepository
from app.repositories.bank_transaction_repository import BankTransactionRepository
from app.repositories.journal_repository import JournalRepository
from app.services.tax_calculation_service import TaxCalculationService
from app.core.enums import TaxCodeAppliesTo


class BankTransactionService:
    def __init__(self, db: Session):
        self.db = db
        self.accounts = AccountRepository(db)
        self.audit = AuditRepository(db)
        self.bank_accounts = BankAccountRepository(db)
        self.transactions = BankTransactionRepository(db)
        self.journals = JournalRepository(db)
        self.tax = TaxCalculationService(db)

    def _apply_tax_scaffold(self, organization_id, payload: dict):
        if not payload.get("tax_code_id"):
            payload.setdefault("taxable_amount", None)
            payload.setdefault("tax_amount", None)
            payload.setdefault("gross_amount", None)
            payload.setdefault("tax_inclusive_flag", None)
            payload.setdefault("tax_breakdown_json", None)
            return payload
        if not payload.get("target_account_id"):
            raise forbidden("target_account_id is required when tax_code_id is provided for cash coding scaffold")
        gross = abs(Decimal(payload["amount"]))
        result = self.tax.calculate_line(
            organization_id,
            quantity=Decimal("1"),
            unit_price=gross,
            tax_code_id=payload["tax_code_id"],
            usage=TaxCodeAppliesTo.BOTH,
        )
        payload["taxable_amount"] = result.taxable_amount
        payload["tax_amount"] = result.tax_amount
        payload["gross_amount"] = result.gross_amount
        payload["tax_inclusive_flag"] = result.tax_inclusive
        payload["tax_breakdown_json"] = result.tax_breakdown
        return payload

    def create(self, organization_id, actor_user_id, payload):
        bank_account = self.bank_accounts.get(organization_id, payload["bank_account_id"])
        if not bank_account or not bank_account.is_active:
            raise not_found("Bank account not found")
        if payload["amount"] == 0:
            raise forbidden("Bank transaction amount must be non-zero")
        payload = self._apply_tax_scaffold(organization_id, payload)
        txn = self.transactions.create(organization_id=organization_id, created_by_user_id=actor_user_id, status=BankTransactionStatus.UNRECONCILED, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="bank_transaction.created", entity_type="bank_transaction", entity_id=str(txn.id))
        self.db.commit()
        return txn

    def update(self, organization_id, transaction_id, actor_user_id, payload):
        txn = self.transactions.get(organization_id, transaction_id)
        if not txn:
            raise not_found("Bank transaction not found")
        if txn.status == BankTransactionStatus.RECONCILED:
            raise forbidden("Reconciled bank transactions cannot be edited")
        payload = self._apply_tax_scaffold(organization_id, {**txn.__dict__, **payload})
        for k, v in payload.items():
            if k.startswith("_"):
                continue
            setattr(txn, k, v)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="bank_transaction.updated", entity_type="bank_transaction", entity_id=str(txn.id))
        self.db.commit()
        self.db.refresh(txn)
        return txn

    def reconcile_journal(self, organization_id, transaction_id, journal_id, actor_user_id):
        txn = self.transactions.get(organization_id, transaction_id)
        if not txn:
            raise not_found("Bank transaction not found")
        if txn.status == BankTransactionStatus.RECONCILED:
            raise forbidden("Bank transaction is already reconciled")
        bank_account = self.bank_accounts.get(organization_id, txn.bank_account_id)
        journal = self.journals.get(organization_id, journal_id)
        if not journal:
            raise not_found("Journal not found")
        if journal.status != JournalStatus.POSTED:
            raise forbidden("Only posted journals can be reconciled")
        lines = self.journals.lines(journal.id)
        matched_line = next((line for line in lines if line.account_id == bank_account.account_id), None)
        if not matched_line:
            raise forbidden("Journal does not impact the linked bank ledger account")
        line_effect = Decimal(matched_line.debit_amount) - Decimal(matched_line.credit_amount)
        if line_effect != Decimal(txn.amount):
            raise forbidden("Bank transaction amount does not match the journal cash movement")
        txn.status = BankTransactionStatus.RECONCILED
        txn.matched_journal_id = journal.id
        txn.reconciled_by_user_id = actor_user_id
        txn.reconciled_at = datetime.now(UTC)
        bank_account.last_reconciled_at = txn.reconciled_at
        self.audit.create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="bank_transaction.reconciled",
            entity_type="bank_transaction",
            entity_id=str(txn.id),
            metadata_json={"journal_id": str(journal.id)},
        )
        self.db.commit()
        self.db.refresh(txn)
        return txn

    def cash_position(self, organization_id):
        items = []
        for bank_account in self.bank_accounts.list(organization_id):
            bal = self.accounts.get_balance(organization_id, bank_account.account_id)
            ledger_balance = Decimal(bal.closing_debit) - Decimal(bal.closing_credit)
            unreconciled = sum(
                (Decimal(txn.amount) for txn in self.transactions.list(organization_id, bank_account_id=bank_account.id, status=BankTransactionStatus.UNRECONCILED)),
                start=Decimal("0"),
            )
            items.append({
                "bank_account_id": bank_account.id,
                "bank_account_name": bank_account.name,
                "gl_account_id": bank_account.account_id,
                "opening_balance": Decimal(bank_account.opening_balance),
                "ledger_balance": ledger_balance,
                "unreconciled_delta": unreconciled,
            })
        return items
