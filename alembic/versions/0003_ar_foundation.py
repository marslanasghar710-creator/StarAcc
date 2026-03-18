"""accounts receivable foundation

Revision ID: 0003_ar_foundation
Revises: 0002_accounting_core
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0003_ar_foundation"
down_revision = "0002_accounting_core"
branch_labels = None
depends_on = None

invoice_status = sa.Enum("draft", "approved", "sent", "partially_paid", "paid", "overdue", "voided", "cancelled", name="invoice_status")
invoice_type = sa.Enum("standard", "recurring_template", name="invoice_type")
credit_note_status = sa.Enum("draft", "approved", "posted", "applied", "voided", name="credit_note_status")
payment_status = sa.Enum("draft", "posted", "voided", name="payment_status")


def upgrade() -> None:
    invoice_status.create(op.get_bind(), checkfirst=True)
    invoice_type.create(op.get_bind(), checkfirst=True)
    credit_note_status.create(op.get_bind(), checkfirst=True)
    payment_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "accounting_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("accounts_receivable_control_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("default_sales_revenue_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id")),
        sa.Column("default_customer_receipts_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", name="uq_accounting_settings_org"),
    )

    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("customer_number", sa.String(50)),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("legal_name", sa.String(255)),
        sa.Column("email", sa.String(320)),
        sa.Column("phone", sa.String(50)),
        sa.Column("website", sa.String(255)),
        sa.Column("tax_number", sa.String(100)),
        sa.Column("currency_code", sa.String(3)),
        sa.Column("payment_terms_days", sa.Integer()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("billing_address_line1", sa.String(255)),
        sa.Column("billing_address_line2", sa.String(255)),
        sa.Column("billing_city", sa.String(100)),
        sa.Column("billing_state", sa.String(100)),
        sa.Column("billing_postal_code", sa.String(20)),
        sa.Column("billing_country", sa.String(100)),
        sa.Column("shipping_address_line1", sa.String(255)),
        sa.Column("shipping_address_line2", sa.String(255)),
        sa.Column("shipping_city", sa.String(100)),
        sa.Column("shipping_state", sa.String(100)),
        sa.Column("shipping_postal_code", sa.String(20)),
        sa.Column("shipping_country", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("invoice_number", sa.String(50), nullable=False),
        sa.Column("status", invoice_status, nullable=False),
        sa.Column("invoice_type", invoice_type, nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("exchange_rate", sa.Numeric(20, 8)),
        sa.Column("subtotal_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("discount_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("tax_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("total_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("amount_paid", sa.Numeric(20, 8), nullable=False),
        sa.Column("amount_due", sa.Numeric(20, 8), nullable=False),
        sa.Column("reference", sa.String(100)),
        sa.Column("customer_po_number", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("terms", sa.Text()),
        sa.Column("source_module", sa.String(50)),
        sa.Column("posted_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("voided_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approved_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("posted_at", sa.DateTime(timezone=True)),
        sa.Column("voided_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "invoice_number", name="uq_invoice_org_number"),
    )
    op.create_index("ix_invoices_org_customer", "invoices", ["organization_id", "customer_id"])

    op.create_table(
        "invoice_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("item_code", sa.String(100)),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("unit_price", sa.Numeric(20, 8), nullable=False),
        sa.Column("discount_percent", sa.Numeric(10, 4)),
        sa.Column("discount_amount", sa.Numeric(20, 8)),
        sa.Column("tax_code_id", postgresql.UUID(as_uuid=True)),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("tracking_category_id", postgresql.UUID(as_uuid=True)),
        sa.Column("line_subtotal", sa.Numeric(20, 8), nullable=False),
        sa.Column("line_tax_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("line_total", sa.Numeric(20, 8), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("invoice_id", "line_number", name="uq_invoice_item_line"),
    )

    op.create_table(
        "credit_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("credit_note_number", sa.String(50), nullable=False),
        sa.Column("status", credit_note_status, nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("exchange_rate", sa.Numeric(20, 8)),
        sa.Column("subtotal_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("tax_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("total_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("unapplied_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("reference", sa.String(100)),
        sa.Column("reason", sa.String(255)),
        sa.Column("related_invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id")),
        sa.Column("posted_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approved_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("posted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "credit_note_number", name="uq_credit_note_org_number"),
    )

    op.create_table(
        "credit_note_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("credit_note_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("credit_notes.id"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("unit_price", sa.Numeric(20, 8), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("tax_code_id", postgresql.UUID(as_uuid=True)),
        sa.Column("line_subtotal", sa.Numeric(20, 8), nullable=False),
        sa.Column("line_tax_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("line_total", sa.Numeric(20, 8), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("credit_note_id", "line_number", name="uq_credit_note_item_line"),
    )

    op.create_table(
        "customer_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("payment_number", sa.String(50), nullable=False),
        sa.Column("status", payment_status, nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("exchange_rate", sa.Numeric(20, 8)),
        sa.Column("amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("unapplied_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("payment_method", sa.String(50)),
        sa.Column("reference", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("deposit_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id")),
        sa.Column("posted_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("posted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "customer_payment_allocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("customer_payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customer_payments.id"), nullable=False),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id")),
        sa.Column("credit_note_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("credit_notes.id")),
        sa.Column("allocated_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("allocation_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("customer_payment_allocations")
    op.drop_table("customer_payments")
    op.drop_table("credit_note_items")
    op.drop_table("credit_notes")
    op.drop_table("invoice_items")
    op.drop_index("ix_invoices_org_customer", table_name="invoices")
    op.drop_table("invoices")
    op.drop_table("customers")
    op.drop_table("accounting_settings")

    payment_status.drop(op.get_bind(), checkfirst=True)
    credit_note_status.drop(op.get_bind(), checkfirst=True)
    invoice_type.drop(op.get_bind(), checkfirst=True)
    invoice_status.drop(op.get_bind(), checkfirst=True)
