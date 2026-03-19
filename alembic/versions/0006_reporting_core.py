"""reporting core

Revision ID: 0006_reporting_core
Revises: 0005_banking_foundation
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0006_reporting_core"
down_revision = "0005_banking_foundation"
branch_labels = None
depends_on = None

report_type = sa.Enum(
    "profit_loss",
    "balance_sheet",
    "trial_balance",
    "general_ledger",
    "account_statement",
    "aged_receivables",
    "aged_payables",
    name="report_type",
)
report_export_format = sa.Enum("json", "csv", "pdf", name="report_export_format")
report_run_status = sa.Enum("pending", "completed", "failed", name="report_run_status")


def upgrade() -> None:
    report_type.create(op.get_bind(), checkfirst=True)
    report_export_format.create(op.get_bind(), checkfirst=True)
    report_run_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "report_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("report_type", report_type, nullable=False),
        sa.Column("parameters_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("generated_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", report_run_status, nullable=False, server_default="completed"),
        sa.Column("row_count", sa.Integer()),
        sa.Column("export_format", report_export_format),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_report_runs_org_report_generated", "report_runs", ["organization_id", "report_type", "generated_at"])

    op.create_table(
        "report_exports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("report_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("report_runs.id")),
        sa.Column("report_type", report_type, nullable=False),
        sa.Column("export_format", report_export_format, nullable=False),
        sa.Column("file_name", sa.String(255)),
        sa.Column("storage_path", sa.String(500)),
        sa.Column("generated_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_report_exports_org_report_generated", "report_exports", ["organization_id", "report_type", "generated_at"])


def downgrade() -> None:
    op.drop_index("ix_report_exports_org_report_generated", table_name="report_exports")
    op.drop_table("report_exports")
    op.drop_index("ix_report_runs_org_report_generated", table_name="report_runs")
    op.drop_table("report_runs")
    report_run_status.drop(op.get_bind(), checkfirst=True)
    report_export_format.drop(op.get_bind(), checkfirst=True)
    report_type.drop(op.get_bind(), checkfirst=True)
