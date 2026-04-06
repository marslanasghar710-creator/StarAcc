"""add billing subscription foundation

Revision ID: 0016_billing_subscriptions
Revises: 0015_onboarding_layer
Create Date: 2026-04-03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0016_billing_subscriptions"
down_revision = "0015_onboarding_layer"
branch_labels = None
depends_on = None

billing_account_status = postgresql.ENUM("active", "suspended", "closed", name="billing_account_status", create_type=False)
billing_scope_type = postgresql.ENUM("organization", "group", "enterprise", name="billing_scope_type", create_type=False)
billing_interval = postgresql.ENUM("monthly", "yearly", name="billing_interval", create_type=False)
subscription_status = postgresql.ENUM(
    "trialing", "active", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "expired", name="subscription_status", create_type=False
)
plan_price_interval = postgresql.ENUM("monthly", "yearly", name="plan_price_interval", create_type=False)


def upgrade() -> None:
    billing_account_status.create(op.get_bind(), checkfirst=True)
    billing_scope_type.create(op.get_bind(), checkfirst=True)
    billing_interval.create(op.get_bind(), checkfirst=True)
    subscription_status.create(op.get_bind(), checkfirst=True)
    plan_price_interval.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "billing_accounts",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scope_type", billing_scope_type, nullable=False, server_default="organization"),
        sa.Column("status", billing_account_status, nullable=False, server_default="active"),
        sa.Column("provider_customer_id", sa.String(length=120), nullable=True),
        sa.Column("billing_email", sa.String(length=255), nullable=True),
        sa.Column("billing_contact_name", sa.String(length=160), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("country", sa.String(length=2), nullable=True),
        sa.Column("tax_id", sa.String(length=64), nullable=True),
        sa.Column("is_billing_exempt", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_billing_accounts_organization_id"), "billing_accounts", ["organization_id"], unique=False)

    op.create_table(
        "subscriptions",
        sa.Column("billing_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_code", sa.String(length=80), nullable=False),
        sa.Column("status", subscription_status, nullable=False, server_default="trialing"),
        sa.Column("billing_interval", billing_interval, nullable=False, server_default="monthly"),
        sa.Column("trial_start_at", sa.String(length=40), nullable=True),
        sa.Column("trial_end_at", sa.String(length=40), nullable=True),
        sa.Column("current_period_start", sa.String(length=40), nullable=True),
        sa.Column("current_period_end", sa.String(length=40), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("canceled_at", sa.String(length=40), nullable=True),
        sa.Column("provider_subscription_id", sa.String(length=120), nullable=True),
        sa.Column("seats_purchased", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["billing_account_id"], ["billing_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscriptions_billing_account_id"), "subscriptions", ["billing_account_id"], unique=False)

    op.create_table(
        "subscription_entitlement_overrides",
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entitlement_key", sa.String(length=120), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("limit_value", sa.Integer(), nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("subscription_id", "entitlement_key", name="uq_subscription_entitlement_override"),
    )
    op.create_index(op.f("ix_subscription_entitlement_overrides_subscription_id"), "subscription_entitlement_overrides", ["subscription_id"], unique=False)

    op.create_table(
        "billing_usage_snapshots",
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("metric_key", sa.String(length=120), nullable=False),
        sa.Column("used_value", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("limit_value", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="within_limit"),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("subscription_id", "metric_key", name="uq_billing_usage_snapshot"),
    )
    op.create_index(op.f("ix_billing_usage_snapshots_subscription_id"), "billing_usage_snapshots", ["subscription_id"], unique=False)

    op.create_table(
        "plan_prices",
        sa.Column("plan_code", sa.String(length=80), nullable=False),
        sa.Column("interval", plan_price_interval, nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("plan_code", "interval"),
        sa.UniqueConstraint("plan_code", "interval", name="uq_plan_price_plan_interval"),
    )


def downgrade() -> None:
    op.drop_table("plan_prices")

    op.drop_index(op.f("ix_billing_usage_snapshots_subscription_id"), table_name="billing_usage_snapshots")
    op.drop_table("billing_usage_snapshots")

    op.drop_index(op.f("ix_subscription_entitlement_overrides_subscription_id"), table_name="subscription_entitlement_overrides")
    op.drop_table("subscription_entitlement_overrides")

    op.drop_index(op.f("ix_subscriptions_billing_account_id"), table_name="subscriptions")
    op.drop_table("subscriptions")

    op.drop_index(op.f("ix_billing_accounts_organization_id"), table_name="billing_accounts")
    op.drop_table("billing_accounts")

    plan_price_interval.drop(op.get_bind(), checkfirst=True)
    subscription_status.drop(op.get_bind(), checkfirst=True)
    billing_interval.drop(op.get_bind(), checkfirst=True)
    billing_scope_type.drop(op.get_bind(), checkfirst=True)
    billing_account_status.drop(op.get_bind(), checkfirst=True)
