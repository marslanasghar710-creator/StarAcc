from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Permission, Role, RolePermission


class RBACRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_roles(self):
        return list(self.db.scalars(select(Role).where(Role.deleted_at.is_(None))).all())

    def get_permissions(self):
        return list(self.db.scalars(select(Permission).where(Permission.deleted_at.is_(None))).all())

    def role_has_permission(self, role_id, code: str) -> bool:
        query = (
            select(Permission.id)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id == role_id, Permission.code == code)
        )
        return self.db.scalar(query) is not None

    def get_role_by_name(self, name: str):
        return self.db.scalar(select(Role).where(Role.name == name))
