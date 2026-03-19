from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import StoredFile


class FileRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs):
        row = StoredFile(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get(self, organization_id, file_id, *, include_deleted: bool = False):
        query = select(StoredFile).where(StoredFile.organization_id == organization_id, StoredFile.id == file_id)
        if not include_deleted:
            query = query.where(StoredFile.deleted_at.is_(None))
        return self.db.scalar(query)

    def list(self, organization_id):
        return list(
            self.db.scalars(
                select(StoredFile).where(StoredFile.organization_id == organization_id, StoredFile.deleted_at.is_(None)).order_by(StoredFile.uploaded_at.desc())
            ).all()
        )
