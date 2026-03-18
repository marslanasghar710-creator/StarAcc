from sqlalchemy.orm import Session

from app.core.enums import AccountType
from app.core.exceptions import forbidden, not_found
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.bank_account_repository import BankAccountRepository


class BankAccountService:
    def __init__(self, db: Session):
        self.db = db
        self.accounts = AccountRepository(db)
        self.bank_accounts = BankAccountRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, actor_user_id, payload):
        account = self.accounts.get(organization_id, payload["account_id"])
        if not account:
            raise not_found("Account not found")
        if account.account_type != AccountType.ASSET:
            raise forbidden("Bank account must be linked to an asset account")
        if self.bank_accounts.get_by_account(organization_id, account.id):
            raise forbidden("A bank account already exists for this ledger account")
        bank_account = self.bank_accounts.create(organization_id=organization_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="bank_account.created", entity_type="bank_account", entity_id=str(bank_account.id))
        self.db.commit()
        return bank_account

    def update(self, organization_id, bank_account_id, actor_user_id, payload):
        bank_account = self.bank_accounts.get(organization_id, bank_account_id)
        if not bank_account:
            raise not_found("Bank account not found")
        for k, v in payload.items():
            setattr(bank_account, k, v)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="bank_account.updated", entity_type="bank_account", entity_id=str(bank_account.id))
        self.db.commit()
        self.db.refresh(bank_account)
        return bank_account
