"""projects job costing foundation

Revision ID: 0010_projects_job_costing
Revises: 0009_inventory_foundation
Create Date: 2026-03-22
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0010_projects_job_costing"
down_revision = "0009_inventory_foundation"
branch_labels = None
depends_on = None


project_status = sa.Enum("draft", "active", "on_hold", "completed", "cancelled", name="project_status")


def upgrade() -> None:
    project_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("code", sa.String(50), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", project_status, nullable=False, server_default="draft"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("budget_revenue", sa.Numeric(20, 8), nullable=True),
        sa.Column("budget_cost", sa.Numeric(20, 8), nullable=True),
        sa.Column("budget_hours", sa.Numeric(20, 8), nullable=True),
        sa.Column("currency_code", sa.String(3), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "code", name="uq_project_org_code"),
        sa.CheckConstraint("budget_revenue >= 0", name="ck_project_budget_revenue_non_negative"),
        sa.CheckConstraint("budget_cost >= 0", name="ck_project_budget_cost_non_negative"),
        sa.CheckConstraint("budget_hours >= 0", name="ck_project_budget_hours_non_negative"),
    )
    op.create_index("ix_projects_org", "projects", ["organization_id"])
    op.create_index("ix_projects_customer", "projects", ["customer_id"])
    op.create_index("ix_projects_owner", "projects", ["owner_user_id"])

    op.create_table(
        "project_cost_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("source_entity_type", sa.String(50), nullable=False),
        sa.Column("source_entity_id", sa.String(100), nullable=False),
        sa.Column("source_line_id", sa.String(100), nullable=True),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reversal_of_entry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project_cost_entries.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("amount != 0", name="ck_project_cost_entry_amount_non_zero"),
    )
    op.create_index("ix_project_cost_entries_org", "project_cost_entries", ["organization_id"])
    op.create_index("ix_project_cost_entries_project", "project_cost_entries", ["project_id"])
    op.create_index("ix_project_cost_entries_source", "project_cost_entries", ["source_entity_id"])

    op.create_table(
        "project_revenue_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("source_entity_type", sa.String(50), nullable=False),
        sa.Column("source_entity_id", sa.String(100), nullable=False),
        sa.Column("source_line_id", sa.String(100), nullable=True),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reversal_of_entry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project_revenue_entries.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("amount != 0", name="ck_project_revenue_entry_amount_non_zero"),
    )
    op.create_index("ix_project_revenue_entries_org", "project_revenue_entries", ["organization_id"])
    op.create_index("ix_project_revenue_entries_project", "project_revenue_entries", ["project_id"])
    op.create_index("ix_project_revenue_entries_source", "project_revenue_entries", ["source_entity_id"])

    op.create_table(
        "project_time_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("hours", sa.Numeric(20, 8), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("is_billable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("cost_rate", sa.Numeric(20, 8), nullable=True),
        sa.Column("billing_rate", sa.Numeric(20, 8), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("hours > 0", name="ck_project_time_entry_hours_positive"),
        sa.CheckConstraint("cost_rate >= 0", name="ck_project_time_entry_cost_rate_non_negative"),
        sa.CheckConstraint("billing_rate >= 0", name="ck_project_time_entry_billing_rate_non_negative"),
    )
    op.create_index("ix_project_time_entries_org", "project_time_entries", ["organization_id"])
    op.create_index("ix_project_time_entries_project", "project_time_entries", ["project_id"])
    op.create_index("ix_project_time_entries_user", "project_time_entries", ["user_id"])

    op.create_table(
        "project_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("from_status", project_status, nullable=True),
        sa.Column("to_status", project_status, nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("changed_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_project_status_history_org", "project_status_history", ["organization_id"])
    op.create_index("ix_project_status_history_project", "project_status_history", ["project_id"])

    op.add_column("invoice_items", sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_invoice_items_project_id", "invoice_items", "projects", ["project_id"], ["id"])
    op.create_index("ix_invoice_items_project_id", "invoice_items", ["project_id"])

    op.add_column("bill_items", sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_bill_items_project_id", "bill_items", "projects", ["project_id"], ["id"])
    op.create_index("ix_bill_items_project_id", "bill_items", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_bill_items_project_id", table_name="bill_items")
    op.drop_constraint("fk_bill_items_project_id", "bill_items", type_="foreignkey")
    op.drop_column("bill_items", "project_id")

    op.drop_index("ix_invoice_items_project_id", table_name="invoice_items")
    op.drop_constraint("fk_invoice_items_project_id", "invoice_items", type_="foreignkey")
    op.drop_column("invoice_items", "project_id")

    op.drop_index("ix_project_status_history_project", table_name="project_status_history")
    op.drop_index("ix_project_status_history_org", table_name="project_status_history")
    op.drop_table("project_status_history")

    op.drop_index("ix_project_time_entries_user", table_name="project_time_entries")
    op.drop_index("ix_project_time_entries_project", table_name="project_time_entries")
    op.drop_index("ix_project_time_entries_org", table_name="project_time_entries")
    op.drop_table("project_time_entries")

    op.drop_index("ix_project_revenue_entries_source", table_name="project_revenue_entries")
    op.drop_index("ix_project_revenue_entries_project", table_name="project_revenue_entries")
    op.drop_index("ix_project_revenue_entries_org", table_name="project_revenue_entries")
    op.drop_table("project_revenue_entries")

    op.drop_index("ix_project_cost_entries_source", table_name="project_cost_entries")
    op.drop_index("ix_project_cost_entries_project", table_name="project_cost_entries")
    op.drop_index("ix_project_cost_entries_org", table_name="project_cost_entries")
    op.drop_table("project_cost_entries")

    op.drop_index("ix_projects_owner", table_name="projects")
    op.drop_index("ix_projects_customer", table_name="projects")
    op.drop_index("ix_projects_org", table_name="projects")
    op.drop_table("projects")

    project_status.drop(op.get_bind(), checkfirst=True)
