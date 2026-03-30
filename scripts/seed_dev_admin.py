"""Seed a local-development admin user and organization.

Intended for local/dev environments only.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import MembershipStatus
from app.core.security import hash_password
from app.db.models import OrganizationUser
from app.repositories.membership import MembershipRepository
from app.repositories.orgs import OrganizationRepository
from app.repositories.rbac import RBACRepository
from app.repositories.users import UserRepository

UTC = timezone.utc


def seed_dev_admin() -> tuple[str, str, str]:
    email = os.getenv("STARACC_DEV_ADMIN_EMAIL", "admin@staracc.local").strip().lower()
    password = os.getenv("STARACC_DEV_ADMIN_PASSWORD", "StrongPass123")
    organization_name = os.getenv("STARACC_DEV_ADMIN_ORG", "StarAcc Demo Org").strip()

    engine = create_engine(settings.database_url)

    with Session(engine) as db:
        users = UserRepository(db)
        memberships = MembershipRepository(db)
        rbac = RBACRepository(db)
        orgs = OrganizationRepository(db)

        user = users.get_by_email(email)
        if not user:
            user = users.create(email=email, password_hash=hash_password(password))

        admin_role = rbac.get_role_by_name("admin")
        if not admin_role:
            raise RuntimeError("Role 'admin' not found. Run scripts/seed_rbac.py first.")

        existing_membership = db.scalar(
            select(OrganizationUser).where(OrganizationUser.user_id == user.id, OrganizationUser.deleted_at.is_(None))
        )

        if existing_membership:
            existing_membership.role_id = admin_role.id
            db.commit()
            return email, password, str(existing_membership.organization_id)

        org = orgs.create({"name": organization_name})
        memberships.create_membership(
            user_id=user.id,
            organization_id=org.id,
            role_id=admin_role.id,
            is_default=True,
            joined_at=datetime.now(UTC),
            status=MembershipStatus.ACTIVE,
        )
        db.commit()
        return email, password, str(org.id)


def main() -> None:
    email, password, org_id = seed_dev_admin()
    print("Seeded local admin user")
    print(f"email={email}")
    print(f"password={password}")
    print(f"organization_id={org_id}")


if __name__ == "__main__":
    main()
