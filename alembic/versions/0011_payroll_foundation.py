"""payroll foundation

Revision ID: 0011_payroll_foundation
Revises: 0010_projects_job_costing
Create Date: 2026-03-22
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0011_payroll_foundation"
down_revision = "0010_projects_job_costing"
branch_labels = None
depends_on = None


employee_status = sa.Enum("active", "inactive", "terminated", name="employee_status")
employment_type = sa.Enum("salaried", "hourly", "contractor_scaffold", name="employment_type")
payroll_period_status = sa.Enum("draft", "processed", "posted", name="payroll_period_status")
payroll_run_status = sa.Enum("draft", "calculated", "posted", name="payroll_run_status")
payroll_line_item_type = sa.Enum("earning", "deduction", "employer_cost", name="payroll_line_item_type")
payroll_earning_amount_type = sa.Enum("fixed", "hourly", "manual", name="payroll_earning_amount_type")


def upgrade() -> None:
    bind = op.get_bind()
    employee_status.create(bind, checkfirst=True)
    employment_type.create(bind, checkfirst=True)
    payroll_period_status.create(bind, checkfirst=True)
    payroll_run_status.create(bind, checkfirst=True)
    payroll_line_item_type.create(bind, checkfirst=True)
    payroll_earning_amount_type.create(bind, checkfirst=True)

    op.create_table(
        "employees",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("first_name", sa.String(120), nullable=False),
        sa.Column("last_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("employment_type", employment_type, nullable=False),
        sa.Column("status", employee_status, nullable=False, server_default="active"),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("default_salary_amount", sa.Numeric(20, 8), nullable=True),
        sa.Column("default_hourly_rate", sa.Numeric(20, 8), nullable=True),
        sa.Column("payroll_expense_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("payroll_settings_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "email", name="uq_employee_org_email"),
        sa.CheckConstraint("default_salary_amount >= 0", name="ck_employee_salary_non_negative"),
        sa.CheckConstraint("default_hourly_rate >= 0", name="ck_employee_hourly_non_negative"),
    )
    op.create_index("ix_employees_org", "employees", ["organization_id"])
    op.create_index("ix_employees_status", "employees", ["status"])

    op.create_table(
        "payroll_earning_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("amount_type", payroll_earning_amount_type, nullable=False, server_default="manual"),
        sa.Column("expense_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "code", name="uq_payroll_earning_type_org_code"),
    )
    op.create_index("ix_payroll_earning_types_org", "payroll_earning_types", ["organization_id"])

    op.create_table(
        "payroll_deduction_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("liability_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("employer_expense_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "code", name="uq_payroll_deduction_type_org_code"),
    )
    op.create_index("ix_payroll_deduction_types_org", "payroll_deduction_types", ["organization_id"])

    op.create_table(
        "payroll_periods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("pay_date", sa.Date(), nullable=False),
        sa.Column("status", payroll_period_status, nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "start_date", "end_date", name="uq_payroll_period_org_dates"),
        sa.CheckConstraint("start_date <= end_date", name="ck_payroll_period_dates_valid"),
        sa.CheckConstraint("pay_date >= start_date", name="ck_payroll_period_pay_date_after_start"),
    )
    op.create_index("ix_payroll_periods_org", "payroll_periods", ["organization_id"])

    op.create_table(
        "payroll_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("payroll_period_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payroll_periods.id"), nullable=False),
        sa.Column("status", payroll_run_status, nullable=False, server_default="draft"),
        sa.Column("funding_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("default_expense_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("reference", sa.String(120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("total_gross", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("total_net", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("total_deductions", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("total_employer_costs", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("entry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("posted_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id"), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "payroll_period_id", name="uq_payroll_run_org_period"),
        sa.CheckConstraint("total_gross >= 0", name="ck_payroll_run_gross_non_negative"),
        sa.CheckConstraint("total_net >= 0", name="ck_payroll_run_net_non_negative"),
        sa.CheckConstraint("total_deductions >= 0", name="ck_payroll_run_deductions_non_negative"),
        sa.CheckConstraint("total_employer_costs >= 0", name="ck_payroll_run_employer_costs_non_negative"),
    )
    op.create_index("ix_payroll_runs_org", "payroll_runs", ["organization_id"])
    op.create_index("ix_payroll_runs_period", "payroll_runs", ["payroll_period_id"])

    op.create_table(
        "payroll_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("payroll_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payroll_runs.id"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("gross_pay", sa.Numeric(20, 8), nullable=False),
        sa.Column("total_deductions", sa.Numeric(20, 8), nullable=False),
        sa.Column("employer_costs", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("net_pay", sa.Numeric(20, 8), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("payroll_run_id", "employee_id", name="uq_payroll_entry_run_employee"),
        sa.CheckConstraint("gross_pay >= 0", name="ck_payroll_entry_gross_non_negative"),
        sa.CheckConstraint("total_deductions >= 0", name="ck_payroll_entry_deductions_non_negative"),
        sa.CheckConstraint("employer_costs >= 0", name="ck_payroll_entry_employer_costs_non_negative"),
        sa.CheckConstraint("net_pay >= 0", name="ck_payroll_entry_net_non_negative"),
    )
    op.create_index("ix_payroll_entries_org", "payroll_entries", ["organization_id"])
    op.create_index("ix_payroll_entries_run", "payroll_entries", ["payroll_run_id"])
    op.create_index("ix_payroll_entries_employee", "payroll_entries", ["employee_id"])

    op.create_table(
        "payroll_line_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("payroll_entry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payroll_entries.id"), nullable=False),
        sa.Column("type", payroll_line_item_type, nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=True),
        sa.Column("rate", sa.Numeric(20, 8), nullable=True),
        sa.Column("expense_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("liability_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("earning_type_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payroll_earning_types.id"), nullable=True),
        sa.Column("deduction_type_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payroll_deduction_types.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("amount >= 0", name="ck_payroll_line_item_amount_non_negative"),
    )
    op.create_index("ix_payroll_line_items_org", "payroll_line_items", ["organization_id"])
    op.create_index("ix_payroll_line_items_entry", "payroll_line_items", ["payroll_entry_id"])


def downgrade() -> None:
    op.drop_index("ix_payroll_line_items_entry", table_name="payroll_line_items")
    op.drop_index("ix_payroll_line_items_org", table_name="payroll_line_items")
    op.drop_table("payroll_line_items")

    op.drop_index("ix_payroll_entries_employee", table_name="payroll_entries")
    op.drop_index("ix_payroll_entries_run", table_name="payroll_entries")
    op.drop_index("ix_payroll_entries_org", table_name="payroll_entries")
    op.drop_table("payroll_entries")

    op.drop_index("ix_payroll_runs_period", table_name="payroll_runs")
    op.drop_index("ix_payroll_runs_org", table_name="payroll_runs")
    op.drop_table("payroll_runs")

    op.drop_index("ix_payroll_periods_org", table_name="payroll_periods")
    op.drop_table("payroll_periods")

    op.drop_index("ix_payroll_deduction_types_org", table_name="payroll_deduction_types")
    op.drop_table("payroll_deduction_types")

    op.drop_index("ix_payroll_earning_types_org", table_name="payroll_earning_types")
    op.drop_table("payroll_earning_types")

    op.drop_index("ix_employees_status", table_name="employees")
    op.drop_index("ix_employees_org", table_name="employees")
    op.drop_table("employees")

    payroll_earning_amount_type.drop(op.get_bind(), checkfirst=True)
    payroll_line_item_type.drop(op.get_bind(), checkfirst=True)
    payroll_run_status.drop(op.get_bind(), checkfirst=True)
    payroll_period_status.drop(op.get_bind(), checkfirst=True)
    employment_type.drop(op.get_bind(), checkfirst=True)
    employee_status.drop(op.get_bind(), checkfirst=True)
