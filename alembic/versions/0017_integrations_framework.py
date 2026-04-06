"""add integrations framework tables

Revision ID: 0017_integrations_framework
Revises: 0016_billing_subscriptions
Create Date: 2026-04-03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0017_integrations_framework"
down_revision = "0016_billing_subscriptions"
branch_labels = None
depends_on = None

integration_auth_type = postgresql.ENUM("oauth2", "api_key", "webhook_secret", "none", name="integration_auth_type", create_type=False)
integration_connection_status = postgresql.ENUM(
    "connecting", "connected", "requires_reauth", "sync_pending", "syncing", "healthy", "degraded", "failed", "disconnected", "archived", name="integration_connection_status", create_type=False
)
integration_credential_status = postgresql.ENUM("active", "expired", "revoked", name="integration_credential_status", create_type=False)
integration_sync_type = postgresql.ENUM("manual", "scheduled", "webhook", "backfill", name="integration_sync_type", create_type=False)
integration_sync_direction = postgresql.ENUM("pull", "push", "bidirectional", name="integration_sync_direction", create_type=False)
integration_sync_status = postgresql.ENUM("pending", "running", "succeeded", "partial", "failed", name="integration_sync_status", create_type=False)


def upgrade() -> None:
    integration_auth_type.create(op.get_bind(), checkfirst=True)
    integration_connection_status.create(op.get_bind(), checkfirst=True)
    integration_credential_status.create(op.get_bind(), checkfirst=True)
    integration_sync_type.create(op.get_bind(), checkfirst=True)
    integration_sync_direction.create(op.get_bind(), checkfirst=True)
    integration_sync_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "integration_providers",
        sa.Column("key", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="available"),
        sa.Column("auth_type", integration_auth_type, nullable=False),
        sa.Column("capabilities", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("supports_webhooks", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("supports_scheduled_sync", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("supports_push", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("supports_pull", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("supports_manual_import", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.PrimaryKeyConstraint("key"),
    )

    op.create_table(
        "integration_connections",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("status", integration_connection_status, nullable=False, server_default="connecting"),
        sa.Column("connection_mode", sa.String(length=40), nullable=False, server_default="manual"),
        sa.Column("external_account_id", sa.String(length=120), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_sync_at", sa.String(length=40), nullable=True),
        sa.Column("last_success_at", sa.String(length=40), nullable=True),
        sa.Column("last_error_at", sa.String(length=40), nullable=True),
        sa.Column("last_error_code", sa.String(length=80), nullable=True),
        sa.Column("last_error_message", sa.String(length=500), nullable=True),
        sa.Column("config_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["provider_key"], ["integration_providers.key"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_integration_connections_organization_id"), "integration_connections", ["organization_id"], unique=False)

    op.create_table(
        "integration_credentials",
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("credential_type", sa.String(length=60), nullable=False),
        sa.Column("secret_ref", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.String(length=40), nullable=True),
        sa.Column("rotated_at", sa.String(length=40), nullable=True),
        sa.Column("status", integration_credential_status, nullable=False, server_default="active"),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_integration_credentials_connection_id"), "integration_credentials", ["connection_id"], unique=False)

    op.create_table(
        "integration_sync_runs",
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("sync_type", integration_sync_type, nullable=False),
        sa.Column("direction", integration_sync_direction, nullable=False),
        sa.Column("status", integration_sync_status, nullable=False, server_default="pending"),
        sa.Column("triggered_by", sa.String(length=60), nullable=False, server_default="manual"),
        sa.Column("started_at", sa.String(length=40), nullable=True),
        sa.Column("completed_at", sa.String(length=40), nullable=True),
        sa.Column("records_seen", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_created", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_updated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_skipped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_failed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cursor_before", sa.String(length=255), nullable=True),
        sa.Column("cursor_after", sa.String(length=255), nullable=True),
        sa.Column("error_summary", sa.String(length=500), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_integration_sync_runs_connection_id"), "integration_sync_runs", ["connection_id"], unique=False)

    op.create_table(
        "integration_sync_cursors",
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stream_key", sa.String(length=120), nullable=False),
        sa.Column("cursor_value", sa.String(length=255), nullable=True),
        sa.Column("last_synced_at", sa.String(length=40), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("connection_id", "stream_key", name="uq_integration_sync_cursor"),
    )
    op.create_index(op.f("ix_integration_sync_cursors_connection_id"), "integration_sync_cursors", ["connection_id"], unique=False)

    op.create_table(
        "integration_mappings",
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resource_type", sa.String(length=120), nullable=False),
        sa.Column("internal_id", sa.String(length=120), nullable=False),
        sa.Column("external_id", sa.String(length=120), nullable=False),
        sa.Column("source_of_truth", sa.String(length=40), nullable=False, server_default="internal"),
        sa.Column("last_external_hash", sa.String(length=120), nullable=True),
        sa.Column("conflict_state", sa.String(length=40), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("connection_id", "resource_type", "external_id", name="uq_integration_mapping_external"),
    )
    op.create_index(op.f("ix_integration_mappings_connection_id"), "integration_mappings", ["connection_id"], unique=False)
    op.create_index(op.f("ix_integration_mappings_organization_id"), "integration_mappings", ["organization_id"], unique=False)

    op.create_table(
        "integration_webhook_events",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("event_id", sa.String(length=120), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("signature_valid", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("normalized_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="received"),
        sa.Column("error_message", sa.String(length=500), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_key", "event_id", name="uq_integration_webhook_event"),
    )
    op.create_index(op.f("ix_integration_webhook_events_organization_id"), "integration_webhook_events", ["organization_id"], unique=False)
    op.create_index(op.f("ix_integration_webhook_events_connection_id"), "integration_webhook_events", ["connection_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_integration_webhook_events_connection_id"), table_name="integration_webhook_events")
    op.drop_index(op.f("ix_integration_webhook_events_organization_id"), table_name="integration_webhook_events")
    op.drop_table("integration_webhook_events")

    op.drop_index(op.f("ix_integration_mappings_organization_id"), table_name="integration_mappings")
    op.drop_index(op.f("ix_integration_mappings_connection_id"), table_name="integration_mappings")
    op.drop_table("integration_mappings")

    op.drop_index(op.f("ix_integration_sync_cursors_connection_id"), table_name="integration_sync_cursors")
    op.drop_table("integration_sync_cursors")

    op.drop_index(op.f("ix_integration_sync_runs_connection_id"), table_name="integration_sync_runs")
    op.drop_table("integration_sync_runs")

    op.drop_index(op.f("ix_integration_credentials_connection_id"), table_name="integration_credentials")
    op.drop_table("integration_credentials")

    op.drop_index(op.f("ix_integration_connections_organization_id"), table_name="integration_connections")
    op.drop_table("integration_connections")

    op.drop_table("integration_providers")

    integration_sync_status.drop(op.get_bind(), checkfirst=True)
    integration_sync_direction.drop(op.get_bind(), checkfirst=True)
    integration_sync_type.drop(op.get_bind(), checkfirst=True)
    integration_credential_status.drop(op.get_bind(), checkfirst=True)
    integration_connection_status.drop(op.get_bind(), checkfirst=True)
    integration_auth_type.drop(op.get_bind(), checkfirst=True)
