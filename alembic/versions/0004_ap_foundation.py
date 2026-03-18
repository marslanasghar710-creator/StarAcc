"""accounts payable foundation

Revision ID: 0004_ap_foundation
Revises: 0003_ar_foundation
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0004_ap_foundation"
down_revision = "0003_ar_foundation"
branch_labels = None
depends_on = None

bill_status = sa.Enum("draft", "approved", "posted", "partially_paid", "paid", "overdue", "voided", "cancelled", name="bill_status")
bill_type = sa.Enum("standard", "recurring_template", name="bill_type")
supplier_credit_status = sa.Enum("draft", "approved", "posted", "applied", "voided", name="supplier_credit_status")


def upgrade() -> None:
    bill_status.create(op.get_bind(), checkfirst=True)
    bill_type.create(op.get_bind(), checkfirst=True)
    supplier_credit_status.create(op.get_bind(), checkfirst=True)

    op.add_column("accounting_settings", sa.Column("accounts_payable_control_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True))
    op.add_column("accounting_settings", sa.Column("default_expense_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True))
    op.add_column("accounting_settings", sa.Column("default_supplier_payments_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True))

    op.create_table(
        "suppliers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("supplier_number", sa.String(50)),
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
        sa.Column("remittance_address_line1", sa.String(255)),
        sa.Column("remittance_address_line2", sa.String(255)),
        sa.Column("remittance_city", sa.String(100)),
        sa.Column("remittance_state", sa.String(100)),
        sa.Column("remittance_postal_code", sa.String(20)),
        sa.Column("remittance_country", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "bills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("bill_number", sa.String(50), nullable=False),
        sa.Column("status", bill_status, nullable=False),
        sa.Column("bill_type", bill_type, nullable=False),
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
        sa.Column("supplier_invoice_number", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("terms", sa.Text()),
        sa.Column("source_module", sa.String(50)),
        sa.Column("posted_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("voided_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approved_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("posted_at", sa.DateTime(timezone=True)),
        sa.Column("voided_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "bill_number", name="uq_bill_org_number"),
    )

    op.create_table(
        "bill_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("bill_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bills.id"), nullable=False),
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
        sa.UniqueConstraint("bill_id", "line_number", name="uq_bill_item_line"),
    )

    op.create_table(
        "supplier_credits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("supplier_credit_number", sa.String(50), nullable=False),
        sa.Column("status", supplier_credit_status, nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("exchange_rate", sa.Numeric(20, 8)),
        sa.Column("subtotal_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("tax_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("total_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("unapplied_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("reference", sa.String(100)),
        sa.Column("reason", sa.String(255)),
        sa.Column("related_bill_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bills.id")),
        sa.Column("posted_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approved_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("posted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "supplier_credit_number", name="uq_supplier_credit_org_number"),
    )

    op.create_table(
        "supplier_credit_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("supplier_credit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier_credits.id"), nullable=False),
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
        sa.UniqueConstraint("supplier_credit_id", "line_number", name="uq_supplier_credit_item_line"),
    )

    op.create_table(
        "supplier_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("payment_number", sa.String(50), nullable=False),
        sa.Column("status", sa.Enum("draft", "posted", "voided", name="payment_status"), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("exchange_rate", sa.Numeric(20, 8)),
        sa.Column("amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("unapplied_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("payment_method", sa.String(50)),
        sa.Column("reference", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("disbursement_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id")),
        sa.Column("posted_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("posted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "supplier_payment_allocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("supplier_payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier_payments.id"), nullable=False),
        sa.Column("bill_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bills.id")),
        sa.Column("supplier_credit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier_credits.id")),
        sa.Column("allocated_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("allocation_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("supplier_payment_allocations")
    op.drop_table("supplier_payments")
    op.drop_table("supplier_credit_items")
    op.drop_table("supplier_credits")
    op.drop_table("bill_items")
    op.drop_table("bills")
    op.drop_table("suppliers")

    op.drop_column("accounting_settings", "default_supplier_payments_account_id")
    op.drop_column("accounting_settings", "default_expense_account_id")
    op.drop_column("accounting_settings", "accounts_payable_control_account_id")

    supplier_credit_status.drop(op.get_bind(), checkfirst=True)
    bill_type.drop(op.get_bind(), checkfirst=True)
    bill_status.drop(op.get_bind(), checkfirst=True)
