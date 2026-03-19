"""tax engine foundation

Revision ID: 0007_tax_engine_foundation
Revises: 0006_reporting_core
Create Date: 2026-03-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0007_tax_engine_foundation"
down_revision = "0006_reporting_core"
branch_labels = None
depends_on = None


tax_basis = sa.Enum("accrual", "cash_scaffold", name="tax_basis")
prices_entered_are = sa.Enum("exclusive", "inclusive", "either", name="prices_entered_are")
tax_rounding_method = sa.Enum("line", "document", name="tax_rounding_method")
tax_periodicity = sa.Enum("monthly", "quarterly", "annually", "none", name="tax_periodicity")
tax_type = sa.Enum("standard", "reduced", "zero", "exempt", "out_of_scope", "reverse_charge_scaffold", name="tax_type")
tax_scope = sa.Enum("sales", "purchases", "both", name="tax_scope")
tax_code_applies_to = sa.Enum("sales", "purchases", "both", name="tax_code_applies_to")
tax_calculation_method = sa.Enum("percentage", "exempt", "out_of_scope", "reverse_charge_scaffold", name="tax_calculation_method")
tax_price_inclusive_behavior = sa.Enum("exclusive", "inclusive", "inherit_organization_default", name="tax_price_inclusive_behavior")
tax_transaction_direction = sa.Enum("output", "input", "neutral", name="tax_transaction_direction")


def upgrade() -> None:
    for enum in [tax_basis, prices_entered_are, tax_rounding_method, tax_periodicity, tax_type, tax_scope, tax_code_applies_to, tax_calculation_method, tax_price_inclusive_behavior, tax_transaction_direction]:
        enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "tax_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("tax_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("tax_registration_number", sa.String(100)),
        sa.Column("tax_basis", tax_basis, nullable=False, server_default="accrual"),
        sa.Column("prices_entered_are", prices_entered_are, nullable=False, server_default="exclusive"),
        sa.Column("default_output_tax_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id")),
        sa.Column("default_input_tax_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id")),
        sa.Column("default_exempt_tax_code_id", postgresql.UUID(as_uuid=True)),
        sa.Column("tax_rounding_method", tax_rounding_method, nullable=False, server_default="line"),
        sa.Column("tax_reporting_currency", sa.String(3)),
        sa.Column("tax_periodicity", tax_periodicity),
        sa.Column("tax_period_start_month", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", name="uq_tax_settings_org"),
    )
    op.create_index("ix_tax_settings_org", "tax_settings", ["organization_id"])

    op.create_table(
        "tax_rates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("percentage", sa.Numeric(10, 4), nullable=False, server_default="0"),
        sa.Column("tax_type", tax_type, nullable=False),
        sa.Column("scope", tax_scope, nullable=False, server_default="both"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("effective_from", sa.Date()),
        sa.Column("effective_to", sa.Date()),
        sa.Column("report_group", sa.String(100)),
        sa.Column("description", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "code", name="uq_tax_rate_org_code"),
        sa.CheckConstraint("percentage >= 0", name="ck_tax_rate_percentage_non_negative"),
    )
    op.create_index("ix_tax_rates_org", "tax_rates", ["organization_id"])
    op.create_index("ix_tax_rates_effective_from", "tax_rates", ["effective_from"])
    op.create_index("ix_tax_rates_effective_to", "tax_rates", ["effective_to"])

    op.create_table(
        "tax_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("description", sa.String(255)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("applies_to", tax_code_applies_to, nullable=False, server_default="both"),
        sa.Column("calculation_method", tax_calculation_method, nullable=False),
        sa.Column("price_inclusive_behavior", tax_price_inclusive_behavior, nullable=False, server_default="inherit_organization_default"),
        sa.Column("report_group", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "code", name="uq_tax_code_org_code"),
    )
    op.create_index("ix_tax_codes_org", "tax_codes", ["organization_id"])

    op.create_foreign_key("fk_tax_settings_default_exempt_tax_code", "tax_settings", "tax_codes", ["default_exempt_tax_code_id"], ["id"])

    op.create_table(
        "tax_code_components",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("tax_code_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tax_codes.id"), nullable=False),
        sa.Column("tax_rate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tax_rates.id"), nullable=False),
        sa.Column("sequence_number", sa.Integer(), nullable=False),
        sa.Column("compound_on_previous", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("tax_code_id", "sequence_number", name="uq_tax_code_component_seq"),
    )
    op.create_index("ix_tax_code_components_org", "tax_code_components", ["organization_id"])

    op.create_table(
        "tax_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("source_module", sa.String(50), nullable=False),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("source_id", sa.String(100), nullable=False),
        sa.Column("source_line_id", sa.String(100)),
        sa.Column("journal_entry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("tax_code_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tax_codes.id")),
        sa.Column("tax_rate_name_snapshot", sa.String(100)),
        sa.Column("tax_rate_percentage_snapshot", sa.Numeric(10, 4)),
        sa.Column("report_group", sa.String(100)),
        sa.Column("direction", tax_transaction_direction, nullable=False),
        sa.Column("net_amount", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("gross_amount", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("tax_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id")),
        sa.Column("tax_breakdown_json", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_tax_transactions_org", "tax_transactions", ["organization_id"])
    op.create_index("ix_tax_transactions_date", "tax_transactions", ["transaction_date"])
    op.create_index("ix_tax_transactions_report_group", "tax_transactions", ["report_group"])
    op.create_index("ix_tax_transactions_direction", "tax_transactions", ["direction"])

    op.add_column("invoices", sa.Column("prices_entered_are", sa.String(20), nullable=True))
    op.add_column("credit_notes", sa.Column("prices_entered_are", sa.String(20), nullable=True))
    op.add_column("bills", sa.Column("prices_entered_are", sa.String(20), nullable=True))
    op.add_column("supplier_credits", sa.Column("prices_entered_are", sa.String(20), nullable=True))

    for table in ["invoice_items", "credit_note_items", "bill_items", "supplier_credit_items"]:
        op.add_column(table, sa.Column("tax_breakdown_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
        op.add_column(table, sa.Column("line_taxable_amount", sa.Numeric(20, 8), nullable=False, server_default="0"))
        op.add_column(table, sa.Column("effective_tax_rate", sa.Numeric(10, 4), nullable=True))
        op.add_column(table, sa.Column("tax_inclusive_flag", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    op.add_column("bank_transactions", sa.Column("target_account_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("bank_transactions", sa.Column("tax_code_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("bank_transactions", sa.Column("tax_breakdown_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("bank_transactions", sa.Column("taxable_amount", sa.Numeric(20, 8), nullable=True))
    op.add_column("bank_transactions", sa.Column("tax_amount", sa.Numeric(20, 8), nullable=True))
    op.add_column("bank_transactions", sa.Column("gross_amount", sa.Numeric(20, 8), nullable=True))
    op.add_column("bank_transactions", sa.Column("tax_inclusive_flag", sa.Boolean(), nullable=True))
    op.create_foreign_key("fk_bank_transactions_target_account", "bank_transactions", "accounts", ["target_account_id"], ["id"])
    op.create_foreign_key("fk_bank_transactions_tax_code", "bank_transactions", "tax_codes", ["tax_code_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_bank_transactions_tax_code", "bank_transactions", type_="foreignkey")
    op.drop_constraint("fk_bank_transactions_target_account", "bank_transactions", type_="foreignkey")
    for column in ["tax_inclusive_flag", "gross_amount", "tax_amount", "taxable_amount", "tax_breakdown_json", "tax_code_id", "target_account_id"]:
        op.drop_column("bank_transactions", column)

    for table in ["supplier_credit_items", "bill_items", "credit_note_items", "invoice_items"]:
        for column in ["tax_inclusive_flag", "effective_tax_rate", "line_taxable_amount", "tax_breakdown_json"]:
            op.drop_column(table, column)

    for table in ["supplier_credits", "bills", "credit_notes", "invoices"]:
        op.drop_column(table, "prices_entered_are")

    for name in ["ix_tax_transactions_direction", "ix_tax_transactions_report_group", "ix_tax_transactions_date", "ix_tax_transactions_org"]:
        op.drop_index(name, table_name="tax_transactions")
    op.drop_table("tax_transactions")
    op.drop_index("ix_tax_code_components_org", table_name="tax_code_components")
    op.drop_table("tax_code_components")
    op.drop_constraint("fk_tax_settings_default_exempt_tax_code", "tax_settings", type_="foreignkey")
    op.drop_index("ix_tax_codes_org", table_name="tax_codes")
    op.drop_table("tax_codes")
    for name in ["ix_tax_rates_effective_to", "ix_tax_rates_effective_from", "ix_tax_rates_org"]:
        op.drop_index(name, table_name="tax_rates")
    op.drop_table("tax_rates")
    op.drop_index("ix_tax_settings_org", table_name="tax_settings")
    op.drop_table("tax_settings")

    for enum in [tax_transaction_direction, tax_price_inclusive_behavior, tax_calculation_method, tax_code_applies_to, tax_scope, tax_type, tax_periodicity, tax_rounding_method, prices_entered_are, tax_basis]:
        enum.drop(op.get_bind(), checkfirst=True)
