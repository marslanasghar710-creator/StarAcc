from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.account_repository import AccountRepository
from app.repositories.journal_repository import JournalRepository


class LedgerService:
    def __init__(self, db: Session):
        self.db = db
        self.accounts = AccountRepository(db)
        self.journals = JournalRepository(db)

    def account_ledger(self, organization_id, account_id, start_date=None, end_date=None):
        return self.accounts.ledger_for_account(organization_id, account_id, start_date, end_date)

    def general_ledger(self, organization_id, start_date=None, end_date=None):
        return self.journals.get_posted_ledger(organization_id, start_date, end_date)

    def trial_balance(self, organization_id):
        accounts = self.accounts.list(organization_id)
        lines = []
        total_debit = Decimal("0")
        total_credit = Decimal("0")
        for account in accounts:
            bal = self.accounts.get_balance(organization_id, account.id)
            debit = bal.closing_debit - bal.closing_credit
            credit = Decimal("0")
            if debit < 0:
                credit = -debit
                debit = Decimal("0")
            total_debit += debit
            total_credit += credit
            lines.append({"account_id": account.id, "code": account.code, "name": account.name, "debit_balance": debit, "credit_balance": credit})
        return {"lines": lines, "total_debit": total_debit, "total_credit": total_credit}
