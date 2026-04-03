from __future__ import annotations

import os
from datetime import timedelta

from sqlalchemy import select

from app.core.enums import MembershipStatus, UserStatus
from app.core.security import hash_password
from app.db.models import Organization, OrganizationUser, Role, User
from app.repositories.orgs import OrganizationRepository
from app.seed.contracts import SeedContext


def provision_demo_organization(context: SeedContext, *, name: str, base_currency: str, timezone: str) -> Organization:
    existing = context.db.scalar(
        select(Organization).where(
            Organization.demo_scenario_key == context.scenario_key,
            Organization.is_demo.is_(True),
            Organization.deleted_at.is_(None),
        )
    )
    if existing and not context.reset:
        return existing
    if existing and context.reset:
        existing.deleted_at = context.now
        context.db.flush()

    organization = OrganizationRepository(context.db).create({
        "name": name,
        "legal_name": f"{name} Ltd",
        "registration_number": f"DEMO-{context.scenario_key.upper()}",
        "tax_number": f"TAX-{context.scenario_key.upper()}",
        "base_currency": base_currency,
        "fiscal_year_start_month": 1,
        "fiscal_year_start_day": 1,
        "timezone": timezone,
    })
    organization.is_demo = True
    organization.demo_scenario_key = context.scenario_key
    organization.seed_version = context.seed_version
    organization.seeded_at = context.now
    organization.seeded_by_system = True
    organization.resettable_in_non_prod = True
    organization.demo_expires_at = context.now + timedelta(days=180)
    context.db.flush()
    return organization


def ensure_demo_users(context: SeedContext, organization_id, scenario_key: str) -> dict[str, User]:
    role_map = {role.name: role for role in context.db.scalars(select(Role)).all()}
    users: dict[str, User] = {}
    templates = [
        ("owner", f"owner+{scenario_key}@demo.staracc.local", "owner"),
        ("finance_manager", f"finmgr+{scenario_key}@demo.staracc.local", "admin"),
        ("accountant", f"accountant+{scenario_key}@demo.staracc.local", "accountant"),
        ("viewer", f"viewer+{scenario_key}@demo.staracc.local", "viewer"),
    ]

    for key, email, role_name in templates:
        user = context.db.scalar(select(User).where(User.email == email))
        if not user:
            user = User(email=email, password_hash=hash_password("DemoPass123!"), status=UserStatus.ACTIVE)
            context.db.add(user)
            context.db.flush()

        membership = context.db.scalar(
            select(OrganizationUser).where(
                OrganizationUser.organization_id == organization_id,
                OrganizationUser.user_id == user.id,
                OrganizationUser.deleted_at.is_(None),
            )
        )
        if not membership:
            membership = OrganizationUser(
                organization_id=organization_id,
                user_id=user.id,
                role_id=role_map[role_name].id,
                is_default=(key == "owner"),
                status=MembershipStatus.ACTIVE,
                joined_at=context.now,
            )
            context.db.add(membership)
        users[key] = user

    # In local/dev environments, attach the seeded admin login (if present) so
    # the UI user from scripts/seed_dev_admin.py can immediately see demo data.
    dev_admin_email = os.getenv("STARACC_DEV_ADMIN_EMAIL", "admin@staracc.dev").strip().lower()
    dev_admin = context.db.scalar(select(User).where(User.email == dev_admin_email))
    if dev_admin:
        membership = context.db.scalar(
            select(OrganizationUser).where(
                OrganizationUser.organization_id == organization_id,
                OrganizationUser.user_id == dev_admin.id,
                OrganizationUser.deleted_at.is_(None),
            )
        )
        if not membership:
            context.db.add(
                OrganizationUser(
                    organization_id=organization_id,
                    user_id=dev_admin.id,
                    role_id=role_map["admin"].id,
                    is_default=False,
                    status=MembershipStatus.ACTIVE,
                    joined_at=context.now,
                )
            )
        users["dev_admin"] = dev_admin

    context.db.flush()
    return users
