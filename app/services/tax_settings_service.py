from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.enums import AccountType, PricesEnteredAre, TaxBasis, TaxRoundingMethod
from app.core.exceptions import forbidden
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.tax_code_repository import TaxCodeRepository
from app.repositories.tax_settings_repository import TaxSettingsRepository


class TaxSettingsService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = TaxSettingsRepository(db)
        self.accounts = AccountRepository(db)
        self.tax_codes = TaxCodeRepository(db)
        self.audit = AuditRepository(db)

    def get_or_create(self, organization_id):
        settings = self.settings.get(organization_id)
        if settings:
            return settings
        settings = self.settings.create(
            organization_id=organization_id,
            tax_enabled=False,
            tax_basis=TaxBasis.ACCRUAL,
            prices_entered_are=PricesEnteredAre.EXCLUSIVE,
            tax_rounding_method=TaxRoundingMethod.LINE,
        )
        self.db.commit()
        return settings

    def update(self, organization_id, actor_user_id, payload):
        settings = self.get_or_create(organization_id)
        if payload.get("default_output_tax_account_id"):
            account = self.accounts.get(organization_id, payload["default_output_tax_account_id"])
            if not account or account.account_type != AccountType.LIABILITY or not account.is_postable:
                raise forbidden("default_output_tax_account_id must be a postable liability account in the organization")
        if payload.get("default_input_tax_account_id"):
            account = self.accounts.get(organization_id, payload["default_input_tax_account_id"])
            if not account or account.account_type != AccountType.ASSET or not account.is_postable:
                raise forbidden("default_input_tax_account_id must be a postable asset account in the organization")
        if payload.get("default_exempt_tax_code_id"):
            code = self.tax_codes.get(organization_id, payload["default_exempt_tax_code_id"])
            if not code:
                raise forbidden("default_exempt_tax_code_id must belong to the organization")
        for key, value in payload.items():
            setattr(settings, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="tax_settings.updated", entity_type="tax_settings", entity_id=str(settings.id))
        self.db.commit()
        self.db.refresh(settings)
        return settings
