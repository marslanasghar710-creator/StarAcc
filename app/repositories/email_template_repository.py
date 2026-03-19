from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import EmailTemplate


class EmailTemplateRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        row = EmailTemplate(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get(self, organization_id, template_id):
        return self.db.scalar(
            select(EmailTemplate).where(EmailTemplate.organization_id == organization_id, EmailTemplate.id == template_id, EmailTemplate.deleted_at.is_(None))
        )

    def list(self, organization_id, *, template_type=None):
        query = select(EmailTemplate).where(EmailTemplate.organization_id == organization_id, EmailTemplate.deleted_at.is_(None))
        if template_type:
            query = query.where(EmailTemplate.template_type == template_type)
        return list(self.db.scalars(query.order_by(EmailTemplate.created_at.desc())).all())

    def get_active_by_type(self, organization_id, template_type):
        return self.db.scalar(
            select(EmailTemplate).where(
                EmailTemplate.organization_id == organization_id,
                EmailTemplate.template_type == template_type,
                EmailTemplate.is_active.is_(True),
                EmailTemplate.deleted_at.is_(None),
            )
        )
