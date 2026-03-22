"""payroll reversal support

Revision ID: 0012_payroll_reversal_support
Revises: 0011_payroll_foundation
Create Date: 2026-03-22
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0012_payroll_reversal_support"
down_revision = "0011_payroll_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payroll_runs", sa.Column("reversal_journal_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("payroll_runs", sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_payroll_runs_reversal_journal_id", "payroll_runs", "journal_entries", ["reversal_journal_id"], ["id"])
    op.create_index("ix_payroll_runs_reversal_journal_id", "payroll_runs", ["reversal_journal_id"])


def downgrade() -> None:
    op.drop_index("ix_payroll_runs_reversal_journal_id", table_name="payroll_runs")
    op.drop_constraint("fk_payroll_runs_reversal_journal_id", "payroll_runs", type_="foreignkey")
    op.drop_column("payroll_runs", "reversed_at")
    op.drop_column("payroll_runs", "reversal_journal_id")
