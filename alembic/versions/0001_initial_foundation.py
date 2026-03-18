"""initial foundation

Revision ID: 0001_initial_foundation
Revises: 
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial_foundation"
down_revision = None
branch_labels = None
depends_on = None


user_status = sa.Enum("active", "invited", "disabled", "locked", name="user_status")
organization_status = sa.Enum("active", "disabled", name="organization_status")
membership_status = sa.Enum("invited", "active", "suspended", name="membership_status")
invitation_status = sa.Enum("pending", "accepted", "declined", "expired", name="invitation_status")


def upgrade() -> None:
    user_status.create(op.get_bind(), checkfirst=True)
    organization_status.create(op.get_bind(), checkfirst=True)
    membership_status.create(op.get_bind(), checkfirst=True)
    invitation_status.create(op.get_bind(), checkfirst=True)

    op.create_table("users", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("email", sa.String(320), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("status", user_status, nullable=False), sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")), sa.Column("mfa_secret_encrypted", sa.String(255)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)))
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table("user_profiles", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True), sa.Column("first_name", sa.String(100)), sa.Column("last_name", sa.String(100)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)))

    op.create_table("organizations", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("name", sa.String(255), nullable=False), sa.Column("legal_name", sa.String(255)), sa.Column("registration_number", sa.String(100)), sa.Column("tax_number", sa.String(100)), sa.Column("base_currency", sa.String(3), nullable=False), sa.Column("fiscal_year_start_month", sa.Integer(), nullable=False), sa.Column("fiscal_year_start_day", sa.Integer(), nullable=False), sa.Column("timezone", sa.String(64), nullable=False), sa.Column("status", organization_status, nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)))

    op.create_table("organization_settings", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, unique=True), sa.Column("default_locale", sa.String(20), nullable=False), sa.Column("date_format", sa.String(20), nullable=False), sa.Column("number_format", sa.String(20), nullable=False), sa.Column("invoice_prefix", sa.String(20), nullable=False), sa.Column("bill_prefix", sa.String(20), nullable=False), sa.Column("journal_prefix", sa.String(20), nullable=False), sa.Column("tax_enabled", sa.Boolean(), nullable=False), sa.Column("multi_currency_enabled", sa.Boolean(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)))

    op.create_table("roles", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("name", sa.String(50), nullable=False), sa.Column("description", sa.String(255)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)))
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    op.create_table("permissions", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("code", sa.String(100), nullable=False), sa.Column("description", sa.String(255)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)))
    op.create_index("ix_permissions_code", "permissions", ["code"], unique=True)

    op.create_table("role_permissions", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id"), nullable=False), sa.Column("permission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("permissions.id"), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)), sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permission"))

    op.create_table("organization_users", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False), sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False), sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id"), nullable=False), sa.Column("is_default", sa.Boolean(), nullable=False), sa.Column("joined_at", sa.DateTime(timezone=True)), sa.Column("invited_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")), sa.Column("status", membership_status, nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)), sa.UniqueConstraint("user_id", "organization_id", name="uq_user_org"))

    op.create_table("invitations", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False), sa.Column("email", sa.String(320), nullable=False), sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id"), nullable=False), sa.Column("invited_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False), sa.Column("token", sa.String(255), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("status", invitation_status, nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)), sa.UniqueConstraint("token"))

    op.create_table("sessions", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False), sa.Column("refresh_token_jti", sa.String(100), nullable=False), sa.Column("user_agent", sa.String(255)), sa.Column("ip_address", sa.String(64)), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("revoked_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)), sa.Column("last_used_at", sa.DateTime(timezone=True)), sa.UniqueConstraint("refresh_token_jti"))

    op.create_table("audit_logs", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id")), sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")), sa.Column("action", sa.String(100), nullable=False), sa.Column("entity_type", sa.String(100), nullable=False), sa.Column("entity_id", sa.String(100)), sa.Column("metadata_json", sa.JSON()), sa.Column("ip_address", sa.String(64)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))


def downgrade() -> None:
    for table in ["audit_logs", "sessions", "invitations", "organization_users", "role_permissions", "permissions", "roles", "organization_settings", "organizations", "user_profiles", "users"]:
        op.drop_table(table)
    invitation_status.drop(op.get_bind(), checkfirst=True)
    membership_status.drop(op.get_bind(), checkfirst=True)
    organization_status.drop(op.get_bind(), checkfirst=True)
    user_status.drop(op.get_bind(), checkfirst=True)
