from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import DocumentLink


class DocumentLinkRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        row = DocumentLink(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get(self, organization_id, link_id):
        return self.db.scalar(
            select(DocumentLink).where(DocumentLink.organization_id == organization_id, DocumentLink.id == link_id, DocumentLink.deleted_at.is_(None))
        )

    def find_exact(self, organization_id, file_id, entity_type, entity_id):
        return self.db.scalar(
            select(DocumentLink).where(
                DocumentLink.organization_id == organization_id,
                DocumentLink.file_id == file_id,
                DocumentLink.entity_type == entity_type,
                DocumentLink.entity_id == str(entity_id),
                DocumentLink.deleted_at.is_(None),
            )
        )

    def list(self, organization_id, *, file_id=None, entity_type=None, entity_id=None):
        query = select(DocumentLink).where(DocumentLink.organization_id == organization_id, DocumentLink.deleted_at.is_(None))
        if file_id:
            query = query.where(DocumentLink.file_id == file_id)
        if entity_type:
            query = query.where(DocumentLink.entity_type == entity_type)
        if entity_id:
            query = query.where(DocumentLink.entity_id == str(entity_id))
        query = query.order_by(DocumentLink.linked_at.desc())
        return list(self.db.scalars(query).all())
