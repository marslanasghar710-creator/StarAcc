from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.enums import TaxCalculationMethod, TaxCodeAppliesTo, TaxScope
from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.tax_code_repository import TaxCodeRepository
from app.repositories.tax_rate_repository import TaxRateRepository

UTC = timezone.utc


class TaxCodeService:
    def __init__(self, db: Session):
        self.db = db
        self.codes = TaxCodeRepository(db)
        self.rates = TaxRateRepository(db)
        self.audit = AuditRepository(db)

    def _validate_components(self, organization_id, applies_to, calculation_method, components):
        if calculation_method == TaxCalculationMethod.PERCENTAGE and not components:
            raise forbidden("Percentage tax codes require at least one component")
        if calculation_method != TaxCalculationMethod.PERCENTAGE and components:
            raise forbidden("Only percentage tax codes can define components in this foundation")
        for component in components:
            rate = self.rates.get(organization_id, component["tax_rate_id"])
            if not rate or not rate.is_active:
                raise forbidden("Tax code component must reference an active organization tax rate")
            if applies_to == TaxCodeAppliesTo.SALES and rate.scope not in {TaxScope.SALES, TaxScope.BOTH}:
                raise forbidden("Sales tax code component must use a sales/both tax rate")
            if applies_to == TaxCodeAppliesTo.PURCHASES and rate.scope not in {TaxScope.PURCHASES, TaxScope.BOTH}:
                raise forbidden("Purchase tax code component must use a purchase/both tax rate")

    def _serialize(self, code):
        code.components = self.codes.list_components(code.id)
        return code

    def create(self, organization_id, actor_user_id, payload):
        if self.codes.get_by_code(organization_id, payload["code"]):
            raise forbidden("Tax code already exists")
        components = payload.pop("components", [])
        self._validate_components(organization_id, payload["applies_to"], payload["calculation_method"], components)
        code = self.codes.create(organization_id=organization_id, **payload)
        for component in components:
            self.codes.create_component(organization_id=organization_id, tax_code_id=code.id, **component)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="tax_code.created", entity_type="tax_code", entity_id=str(code.id))
        self.db.commit()
        return self._serialize(code)

    def update(self, organization_id, tax_code_id, actor_user_id, payload):
        code = self.codes.get(organization_id, tax_code_id)
        if not code:
            raise not_found("Tax code not found")
        components = payload.pop("components", None)
        applies_to = payload.get("applies_to", code.applies_to)
        calculation_method = payload.get("calculation_method", code.calculation_method)
        if components is not None:
            self._validate_components(organization_id, applies_to, calculation_method, components)
        for key, value in payload.items():
            setattr(code, key, value)
        if components is not None:
            for component in self.codes.list_components(code.id):
                component.deleted_at = datetime.now(UTC)
            for component in components:
                self.codes.create_component(organization_id=organization_id, tax_code_id=code.id, **component)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="tax_code.updated", entity_type="tax_code", entity_id=str(code.id))
        self.db.commit()
        return self._serialize(code)

    def archive(self, organization_id, tax_code_id, actor_user_id):
        code = self.codes.get(organization_id, tax_code_id)
        if not code:
            raise not_found("Tax code not found")
        code.is_active = False
        code.deleted_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="tax_code.archived", entity_type="tax_code", entity_id=str(code.id))
        self.db.commit()

    def list(self, organization_id, search=None):
        items = self.codes.list(organization_id, search)
        for item in items:
            item.components = self.codes.list_components(item.id)
        return items

    def get(self, organization_id, tax_code_id):
        code = self.codes.get(organization_id, tax_code_id)
        if not code:
            raise not_found("Tax code not found")
        return self._serialize(code)
