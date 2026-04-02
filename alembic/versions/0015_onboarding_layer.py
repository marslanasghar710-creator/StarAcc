"""add onboarding activation tables

Revision ID: 0015_onboarding_layer
Revises: 0014_demo_seed_metadata
Create Date: 2026-03-31
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0015_onboarding_layer"
down_revision = "0014_demo_seed_metadata"
branch_labels = None
depends_on = None


onboarding_path = postgresql.ENUM("explore_demo", "setup_real", "expert_skip", name="onboarding_path", create_type=False)
onboarding_persona = postgresql.ENUM(
    "business_owner", "accountant", "finance_manager", "operator_admin", "exploring", name="onboarding_persona", create_type=False
)
onboarding_task_status = postgresql.ENUM("pending", "completed", "skipped", name="onboarding_task_status", create_type=False)


def upgrade() -> None:
    onboarding_path.create(op.get_bind(), checkfirst=True)
    onboarding_persona.create(op.get_bind(), checkfirst=True)
    onboarding_task_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "user_onboarding_profiles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("selected_path", onboarding_path, nullable=True),
        sa.Column("selected_persona", onboarding_persona, nullable=True),
        sa.Column("current_step_key", sa.String(length=120), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completion_tier", sa.Integer(), nullable=True),
        sa.Column("first_meaningful_action_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_prompts", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("last_resume_context", sa.String(length=120), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "organization_id", name="uq_user_onboarding_profile"),
    )
    op.create_index(op.f("ix_user_onboarding_profiles_organization_id"), "user_onboarding_profiles", ["organization_id"], unique=False)
    op.create_index(op.f("ix_user_onboarding_profiles_user_id"), "user_onboarding_profiles", ["user_id"], unique=False)

    op.create_table(
        "onboarding_task_progress",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_key", sa.String(length=120), nullable=False),
        sa.Column("status", onboarding_task_status, nullable=False, server_default="pending"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("skipped_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "organization_id", "task_key", name="uq_onboarding_task_progress"),
    )
    op.create_index(op.f("ix_onboarding_task_progress_organization_id"), "onboarding_task_progress", ["organization_id"], unique=False)
    op.create_index(op.f("ix_onboarding_task_progress_user_id"), "onboarding_task_progress", ["user_id"], unique=False)

    op.create_table(
        "org_onboarding_status",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("basics_complete", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("accounting_config_complete", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("operations_ready", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("first_transaction_recorded", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("first_report_viewed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("first_export_done", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("completion_tier", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("readiness_cache", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", name="uq_org_onboarding_status_org"),
    )
    op.create_index(op.f("ix_org_onboarding_status_organization_id"), "org_onboarding_status", ["organization_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_org_onboarding_status_organization_id"), table_name="org_onboarding_status")
    op.drop_table("org_onboarding_status")

    op.drop_index(op.f("ix_onboarding_task_progress_user_id"), table_name="onboarding_task_progress")
    op.drop_index(op.f("ix_onboarding_task_progress_organization_id"), table_name="onboarding_task_progress")
    op.drop_table("onboarding_task_progress")

    op.drop_index(op.f("ix_user_onboarding_profiles_user_id"), table_name="user_onboarding_profiles")
    op.drop_index(op.f("ix_user_onboarding_profiles_organization_id"), table_name="user_onboarding_profiles")
    op.drop_table("user_onboarding_profiles")

    onboarding_task_status.drop(op.get_bind(), checkfirst=True)
    onboarding_persona.drop(op.get_bind(), checkfirst=True)
    onboarding_path.drop(op.get_bind(), checkfirst=True)
