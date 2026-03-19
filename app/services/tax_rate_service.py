from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.tax_rate_repository import TaxRateRepository

UTC = timezone.utc


class TaxRateService:
    def __init__(self, db: Session):
        self.db = db
        self.rates = TaxRateRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, actor_user_id, payload):
        if self.rates.get_by_code(organization_id, payload["code"]):
            raise forbidden("Tax rate code already exists")
        rate = self.rates.create(organization_id=organization_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="tax_rate.created", entity_type="tax_rate", entity_id=str(rate.id))
        self.db.commit()
        return rate

    def update(self, organization_id, tax_rate_id, actor_user_id, payload):
        rate = self.rates.get(organization_id, tax_rate_id)
        if not rate:
            raise not_found("Tax rate not found")
        for key, value in payload.items():
            setattr(rate, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="tax_rate.updated", entity_type="tax_rate", entity_id=str(rate.id))
        self.db.commit()
        return rate

    def archive(self, organization_id, tax_rate_id, actor_user_id):
        rate = self.rates.get(organization_id, tax_rate_id)
        if not rate:
            raise not_found("Tax rate not found")
        rate.is_active = False
        rate.deleted_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="tax_rate.archived", entity_type="tax_rate", entity_id=str(rate.id))
        self.db.commit()
