from datetime import datetime, timezone

UTC = timezone.utc

from sqlalchemy.orm import Session

from app.core.enums import AccountType, NormalBalance
from app.core.exceptions import forbidden, not_found
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository


DEFAULT_NORMAL = {
    AccountType.ASSET: NormalBalance.DEBIT,
    AccountType.EXPENSE: NormalBalance.DEBIT,
    AccountType.LIABILITY: NormalBalance.CREDIT,
    AccountType.EQUITY: NormalBalance.CREDIT,
    AccountType.REVENUE: NormalBalance.CREDIT,
}


class AccountService:
    def __init__(self, db: Session):
        self.db = db
        self.accounts = AccountRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, user_id, payload: dict):
        if self.accounts.get_by_code(organization_id, payload["code"]):
            raise forbidden("Account code already exists")
        payload["organization_id"] = organization_id
        payload["normal_balance"] = payload.get("normal_balance") or DEFAULT_NORMAL[payload["account_type"]]
        account = self.accounts.create(**payload)
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="account.created", entity_type="account", entity_id=str(account.id))
        self.db.commit()
        return account

    def update(self, organization_id, account_id, user_id, payload):
        account = self.accounts.get(organization_id, account_id)
        if not account:
            raise not_found("Account not found")
        for k, v in payload.items():
            setattr(account, k, v)
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="account.updated", entity_type="account", entity_id=str(account.id))
        self.db.commit()
        self.db.refresh(account)
        return account

    def archive(self, organization_id, account_id, user_id):
        account = self.accounts.get(organization_id, account_id)
        if not account:
            raise not_found("Account not found")
        if account.is_system:
            raise forbidden("System account cannot be archived")
        if self.accounts.account_has_non_zero_balance(organization_id, account_id):
            raise forbidden("Cannot archive account with non-zero balance")
        account.is_active = False
        account.deleted_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=user_id, action="account.archived", entity_type="account", entity_id=str(account.id))
        self.db.commit()
