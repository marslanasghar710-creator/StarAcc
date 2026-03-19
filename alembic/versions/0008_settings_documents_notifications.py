"""settings documents notifications foundation

Revision ID: 0008_settings_documents_notifications
Revises: 0007_tax_engine_foundation
Create Date: 2026-03-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0008_settings_documents_notifications"
down_revision = "0007_tax_engine_foundation"
branch_labels = None
depends_on = None


file_storage_provider = sa.Enum("local", "s3_scaffold", "gcs_scaffold", name="file_storage_provider")
file_status = sa.Enum("active", "deleted", "quarantined_scaffold", name="file_status")
email_template_type = sa.Enum("invoice_send", "invoice_reminder", "payment_receipt", "report_export", "generic_notification", name="email_template_type")
email_status = sa.Enum("queued", "sent", "failed", "cancelled", name="email_status")
notification_type = sa.Enum(
    "invoice_sent",
    "payment_received",
    "bank_import_completed",
    "reconciliation_needed",
    "report_export_ready",
    "generic",
    name="notification_type",
)


def upgrade() -> None:
    for enum in [file_storage_provider, file_status, email_template_type, email_status, notification_type]:
        enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "organization_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("default_locale", sa.String(20), nullable=False, server_default="en_US"),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("date_format", sa.String(20), nullable=False, server_default="YYYY-MM-DD"),
        sa.Column("number_format", sa.String(20), nullable=False, server_default="1,234.56"),
        sa.Column("week_start_day", sa.Integer(), nullable=True),
        sa.Column("default_document_language", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", name="uq_org_preferences_org"),
    )
    op.create_index("ix_org_preferences_org", "organization_preferences", ["organization_id"])

    op.create_table(
        "stored_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("storage_provider", file_storage_provider, nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("original_file_name", sa.String(255), nullable=False),
        sa.Column("file_extension", sa.String(20), nullable=True),
        sa.Column("mime_type", sa.String(255), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("checksum_sha256", sa.String(64), nullable=True),
        sa.Column("uploaded_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", file_status, nullable=False, server_default="active"),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_stored_files_org", "stored_files", ["organization_id"])

    op.create_table(
        "branding_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("brand_name", sa.String(255), nullable=True),
        sa.Column("legal_footer", sa.Text(), nullable=True),
        sa.Column("logo_file_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stored_files.id"), nullable=True),
        sa.Column("primary_color", sa.String(7), nullable=True),
        sa.Column("secondary_color", sa.String(7), nullable=True),
        sa.Column("email_header_text", sa.Text(), nullable=True),
        sa.Column("email_footer_text", sa.Text(), nullable=True),
        sa.Column("invoice_terms_default", sa.Text(), nullable=True),
        sa.Column("bill_terms_default", sa.Text(), nullable=True),
        sa.Column("quote_terms_default", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", name="uq_branding_settings_org"),
    )
    op.create_index("ix_branding_settings_org", "branding_settings", ["organization_id"])

    op.create_table(
        "numbering_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("invoice_prefix", sa.String(20), nullable=False, server_default="INV"),
        sa.Column("credit_note_prefix", sa.String(20), nullable=False, server_default="CRN"),
        sa.Column("payment_prefix", sa.String(20), nullable=False, server_default="PAY"),
        sa.Column("bill_prefix", sa.String(20), nullable=False, server_default="BIL"),
        sa.Column("supplier_credit_prefix", sa.String(20), nullable=False, server_default="SCN"),
        sa.Column("supplier_payment_prefix", sa.String(20), nullable=False, server_default="SPY"),
        sa.Column("journal_prefix", sa.String(20), nullable=False, server_default="JNL"),
        sa.Column("quote_prefix", sa.String(20), nullable=True),
        sa.Column("purchase_order_prefix", sa.String(20), nullable=True),
        sa.Column("next_invoice_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("next_credit_note_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("next_payment_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("next_bill_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("next_supplier_credit_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("next_supplier_payment_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("next_journal_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", name="uq_numbering_settings_org"),
    )
    op.create_index("ix_numbering_settings_org", "numbering_settings", ["organization_id"])

    op.create_table(
        "organization_notification_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("send_invoice_email_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("send_payment_receipt_email_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("send_bill_reminder_email_enabled", sa.Boolean(), nullable=True),
        sa.Column("overdue_invoice_reminder_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reconciliation_alerts_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("report_export_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", name="uq_org_notification_settings_org"),
    )
    op.create_index("ix_org_notification_settings_org", "organization_notification_settings", ["organization_id"])

    op.create_table(
        "user_notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("email_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("in_app_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("invoice_events_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("payment_events_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("report_events_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("banking_events_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_user_notification_preferences_org_user"),
    )
    op.create_index("ix_user_notification_preferences_org", "user_notification_preferences", ["organization_id"])
    op.create_index("ix_user_notification_preferences_user", "user_notification_preferences", ["user_id"])

    op.create_table(
        "document_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("file_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stored_files.id"), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.String(100), nullable=False),
        sa.Column("linked_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("linked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "file_id", "entity_type", "entity_id", name="uq_document_link_exact"),
    )
    op.create_index("ix_document_links_org", "document_links", ["organization_id"])
    op.create_index("ix_document_links_entity_type", "document_links", ["entity_type"])
    op.create_index("ix_document_links_entity_id", "document_links", ["entity_id"])
    op.create_index("ix_document_links_file_id", "document_links", ["file_id"])

    op.create_table(
        "email_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("template_type", email_template_type, nullable=False),
        sa.Column("subject_template", sa.String(500), nullable=False),
        sa.Column("body_template", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_email_templates_org", "email_templates", ["organization_id"])
    op.create_index("ix_email_templates_type", "email_templates", ["template_type"])

    op.create_table(
        "email_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("email_templates.id"), nullable=True),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", sa.String(100), nullable=True),
        sa.Column("to_email", sa.String(320), nullable=False),
        sa.Column("cc_emails", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("bcc_emails", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("rendered_body", sa.Text(), nullable=False),
        sa.Column("status", email_status, nullable=False, server_default="queued"),
        sa.Column("provider_message_id", sa.String(255), nullable=True),
        sa.Column("sent_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_email_logs_org", "email_logs", ["organization_id"])
    op.create_index("ix_email_logs_entity_type", "email_logs", ["entity_type"])
    op.create_index("ix_email_logs_entity_id", "email_logs", ["entity_id"])
    op.create_index("ix_email_logs_status", "email_logs", ["status"])

    op.create_table(
        "in_app_notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("notification_type", notification_type, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", sa.String(100), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_in_app_notifications_org", "in_app_notifications", ["organization_id"])
    op.create_index("ix_in_app_notifications_user", "in_app_notifications", ["user_id"])
    op.create_index("ix_in_app_notifications_is_read", "in_app_notifications", ["is_read"])
    op.create_index("ix_in_app_notifications_entity_type", "in_app_notifications", ["entity_type"])
    op.create_index("ix_in_app_notifications_entity_id", "in_app_notifications", ["entity_id"])
    op.create_index("ix_in_app_notifications_type", "in_app_notifications", ["notification_type"])



def downgrade() -> None:
    for name in [
        "ix_in_app_notifications_type",
        "ix_in_app_notifications_entity_id",
        "ix_in_app_notifications_entity_type",
        "ix_in_app_notifications_is_read",
        "ix_in_app_notifications_user",
        "ix_in_app_notifications_org",
    ]:
        op.drop_index(name, table_name="in_app_notifications")
    op.drop_table("in_app_notifications")

    for name in ["ix_email_logs_status", "ix_email_logs_entity_id", "ix_email_logs_entity_type", "ix_email_logs_org"]:
        op.drop_index(name, table_name="email_logs")
    op.drop_table("email_logs")

    for name in ["ix_email_templates_type", "ix_email_templates_org"]:
        op.drop_index(name, table_name="email_templates")
    op.drop_table("email_templates")

    for name in ["ix_document_links_file_id", "ix_document_links_entity_id", "ix_document_links_entity_type", "ix_document_links_org"]:
        op.drop_index(name, table_name="document_links")
    op.drop_table("document_links")

    for name in ["ix_user_notification_preferences_user", "ix_user_notification_preferences_org"]:
        op.drop_index(name, table_name="user_notification_preferences")
    op.drop_table("user_notification_preferences")

    op.drop_index("ix_org_notification_settings_org", table_name="organization_notification_settings")
    op.drop_table("organization_notification_settings")

    op.drop_index("ix_numbering_settings_org", table_name="numbering_settings")
    op.drop_table("numbering_settings")

    op.drop_index("ix_branding_settings_org", table_name="branding_settings")
    op.drop_table("branding_settings")

    op.drop_index("ix_stored_files_org", table_name="stored_files")
    op.drop_table("stored_files")

    op.drop_index("ix_org_preferences_org", table_name="organization_preferences")
    op.drop_table("organization_preferences")

    for enum in [notification_type, email_status, email_template_type, file_status, file_storage_provider]:
        enum.drop(op.get_bind(), checkfirst=True)
