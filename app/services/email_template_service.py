from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import not_found
from app.repositories.audit import AuditRepository
from app.repositories.email_template_repository import EmailTemplateRepository


class EmailTemplateService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EmailTemplateRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id: str, actor_user_id: str, payload: dict):
        if payload.get("is_active", True):
            self._deactivate_others(organization_id, payload["template_type"])
        row = self.repo.create(organization_id=organization_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="email_template.created", entity_type="email_template", entity_id=str(row.id))
        self.db.commit()
        self.db.refresh(row)
        return row

    def list(self, organization_id: str, template_type=None):
        return self.repo.list(organization_id, template_type=template_type)

    def get(self, organization_id: str, template_id: str):
        row = self.repo.get(organization_id, template_id)
        if not row:
            raise not_found("Email template not found")
        return row

    def update(self, organization_id: str, template_id: str, actor_user_id: str, payload: dict):
        row = self.get(organization_id, template_id)
        if payload.get("is_active"):
            self._deactivate_others(organization_id, payload.get("template_type", row.template_type), exclude_id=row.id)
        for key, value in payload.items():
            setattr(row, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="email_template.updated", entity_type="email_template", entity_id=str(row.id))
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete(self, organization_id: str, template_id: str, actor_user_id: str):
        row = self.get(organization_id, template_id)
        row.deleted_at = datetime.now(timezone.utc)
        row.is_active = False
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="email_template.updated", entity_type="email_template", entity_id=str(row.id))
        self.db.commit()

    def active_template(self, organization_id: str, template_type):
        return self.repo.get_active_by_type(organization_id, template_type)

    def _deactivate_others(self, organization_id: str, template_type, exclude_id=None):
        for row in self.repo.list(organization_id, template_type=template_type):
            if exclude_id and row.id == exclude_id:
                continue
            row.is_active = False
