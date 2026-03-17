"""accounting core

Revision ID: 0002_accounting_core
Revises: 0001_initial_foundation
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0002_accounting_core"
down_revision = "0001_initial_foundation"
branch_labels = None
depends_on = None


account_type = sa.Enum("asset", "liability", "equity", "revenue", "expense", name="account_type")
normal_balance = sa.Enum("debit", "credit", name="normal_balance")
journal_status = sa.Enum("draft", "posted", "reversed", "voided", name="journal_status")
period_status = sa.Enum("open", "closed", "locked", name="period_status")


def upgrade() -> None:
    account_type.create(op.get_bind(), checkfirst=True)
    normal_balance.create(op.get_bind(), checkfirst=True)
    journal_status.create(op.get_bind(), checkfirst=True)
    period_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(500)),
        sa.Column("account_type", account_type, nullable=False),
        sa.Column("account_subtype", sa.String(100)),
        sa.Column("normal_balance", normal_balance, nullable=False),
        sa.Column("parent_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id")),
        sa.Column("currency_code", sa.String(3)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_postable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "code", name="uq_account_org_code"),
    )
    op.create_index("ix_accounts_org", "accounts", ["organization_id"]) 

    op.create_table(
        "financial_periods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column("period_number", sa.Integer(), nullable=False),
        sa.Column("status", period_status, nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        sa.Column("closed_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "fiscal_year", "period_number", name="uq_period_org_year_number"),
    )

    op.create_table(
        "journal_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("entry_number", sa.String(50), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("reference", sa.String(100)),
        sa.Column("source_module", sa.String(50)),
        sa.Column("source_type", sa.String(50)),
        sa.Column("source_id", sa.String(100)),
        sa.Column("status", journal_status, nullable=False),
        sa.Column("period_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("financial_periods.id"), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("posted_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("posted_at", sa.DateTime(timezone=True)),
        sa.Column("reversed_from_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("reversal_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("metadata_json", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "entry_number", name="uq_journal_org_entry_number"),
    )
    op.create_index("ix_journal_org_entry_date", "journal_entries", ["organization_id", "entry_date"])

    op.create_table(
        "journal_lines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("journal_entry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("description", sa.String(500)),
        sa.Column("debit_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("credit_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("exchange_rate", sa.Numeric(20, 8)),
        sa.Column("base_debit_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("base_credit_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("tracking_category_id", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("journal_entry_id", "line_number", name="uq_journal_line_number"),
        sa.CheckConstraint("debit_amount >= 0 AND credit_amount >= 0", name="ck_journal_line_non_negative"),
        sa.CheckConstraint("base_debit_amount >= 0 AND base_credit_amount >= 0", name="ck_journal_line_base_non_negative"),
    )
    op.create_index("ix_journal_lines_org_account", "journal_lines", ["organization_id", "account_id"])

    op.create_table(
        "account_balances",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), primary_key=True),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), primary_key=True),
        sa.Column("opening_debit", sa.Numeric(20, 8), nullable=False),
        sa.Column("opening_credit", sa.Numeric(20, 8), nullable=False),
        sa.Column("period_debit", sa.Numeric(20, 8), nullable=False),
        sa.Column("period_credit", sa.Numeric(20, 8), nullable=False),
        sa.Column("closing_debit", sa.Numeric(20, 8), nullable=False),
        sa.Column("closing_credit", sa.Numeric(20, 8), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "account_period_balances",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), primary_key=True),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), primary_key=True),
        sa.Column("period_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("financial_periods.id"), primary_key=True),
        sa.Column("opening_debit", sa.Numeric(20, 8), nullable=False),
        sa.Column("opening_credit", sa.Numeric(20, 8), nullable=False),
        sa.Column("period_debit", sa.Numeric(20, 8), nullable=False),
        sa.Column("period_credit", sa.Numeric(20, 8), nullable=False),
        sa.Column("closing_debit", sa.Numeric(20, 8), nullable=False),
        sa.Column("closing_credit", sa.Numeric(20, 8), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("account_period_balances")
    op.drop_table("account_balances")
    op.drop_index("ix_journal_lines_org_account", table_name="journal_lines")
    op.drop_table("journal_lines")
    op.drop_index("ix_journal_org_entry_date", table_name="journal_entries")
    op.drop_table("journal_entries")
    op.drop_table("financial_periods")
    op.drop_index("ix_accounts_org", table_name="accounts")
    op.drop_table("accounts")
    period_status.drop(op.get_bind(), checkfirst=True)
    journal_status.drop(op.get_bind(), checkfirst=True)
    normal_balance.drop(op.get_bind(), checkfirst=True)
    account_type.drop(op.get_bind(), checkfirst=True)
