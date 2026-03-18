"""banking foundation

Revision ID: 0005_banking_foundation
Revises: 0004_ap_foundation
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0005_banking_foundation"
down_revision = "0004_ap_foundation"
branch_labels = None
depends_on = None

bank_transaction_type = sa.Enum("deposit", "withdrawal", "fee", "transfer", "adjustment", name="bank_transaction_type")
bank_transaction_status = sa.Enum("unreconciled", "reconciled", name="bank_transaction_status")


def upgrade() -> None:
    bank_transaction_type.create(op.get_bind(), checkfirst=True)
    bank_transaction_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "bank_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("bank_name", sa.String(255)),
        sa.Column("account_number_mask", sa.String(32)),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("opening_balance", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_reconciled_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "name", name="uq_bank_account_org_name"),
        sa.UniqueConstraint("organization_id", "account_id", name="uq_bank_account_org_account"),
    )

    op.create_table(
        "bank_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("bank_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bank_accounts.id"), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("posted_date", sa.Date()),
        sa.Column("transaction_type", bank_transaction_type, nullable=False),
        sa.Column("amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("reference", sa.String(100)),
        sa.Column("memo", sa.Text()),
        sa.Column("status", bank_transaction_status, nullable=False, server_default="unreconciled"),
        sa.Column("matched_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id")),
        sa.Column("source_module", sa.String(50)),
        sa.Column("source_type", sa.String(50)),
        sa.Column("source_id", sa.String(100)),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reconciled_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("reconciled_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("amount <> 0", name="ck_bank_transaction_amount_non_zero"),
    )


def downgrade() -> None:
    op.drop_table("bank_transactions")
    op.drop_table("bank_accounts")
    bank_transaction_status.drop(op.get_bind(), checkfirst=True)
    bank_transaction_type.drop(op.get_bind(), checkfirst=True)
