from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Permission, Role, RolePermission

PERMISSIONS = [
    "org.read",
    "org.update",
    "org.delete",
    "users.invite",
    "users.remove",
    "users.read",
    "roles.read",
    "settings.read",
    "settings.update",
]

ROLE_DEFAULTS = {
    "owner": PERMISSIONS,
    "admin": ["org.read", "org.update", "users.invite", "users.remove", "users.read", "roles.read", "settings.read", "settings.update"],
    "accountant": ["org.read", "users.read", "settings.read"],
    "staff": ["org.read"],
    "viewer": ["org.read"],
}


def main():
    engine = create_engine(settings.database_url)
    with Session(engine) as db:
        permission_map = {}
        for code in PERMISSIONS:
            permission = db.scalar(select(Permission).where(Permission.code == code))
            if not permission:
                permission = Permission(code=code, description=code)
                db.add(permission)
                db.flush()
            permission_map[code] = permission

        for role_name, perm_codes in ROLE_DEFAULTS.items():
            role = db.scalar(select(Role).where(Role.name == role_name))
            if not role:
                role = Role(name=role_name, description=role_name)
                db.add(role)
                db.flush()
            for code in perm_codes:
                exists = db.scalar(
                    select(RolePermission).where(RolePermission.role_id == role.id, RolePermission.permission_id == permission_map[code].id)
                )
                if not exists:
                    db.add(RolePermission(role_id=role.id, permission_id=permission_map[code].id))

        db.commit()


if __name__ == "__main__":
    main()
