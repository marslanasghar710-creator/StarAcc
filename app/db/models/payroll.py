import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import (
    EmployeeStatus,
    EmploymentType,
    PayrollEarningAmountType,
    PayrollLineItemType,
    PayrollPeriodStatus,
    PayrollRunStatus,
)
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class Employee(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_employee_org_email"),
        CheckConstraint("default_salary_amount >= 0", name="ck_employee_salary_non_negative"),
        CheckConstraint("default_hourly_rate >= 0", name="ck_employee_hourly_non_negative"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(120), nullable=False)
    last_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    employment_type: Mapped[EmploymentType] = mapped_column(Enum(EmploymentType, name="employment_type"), nullable=False)
    status: Mapped[EmployeeStatus] = mapped_column(Enum(EmployeeStatus, name="employee_status"), nullable=False, default=EmployeeStatus.ACTIVE)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    default_salary_amount: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    default_hourly_rate: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    payroll_expense_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    payroll_settings_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class PayrollEarningType(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "payroll_earning_types"
    __table_args__ = (UniqueConstraint("organization_id", "code", name="uq_payroll_earning_type_org_code"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    amount_type: Mapped[PayrollEarningAmountType] = mapped_column(Enum(PayrollEarningAmountType, name="payroll_earning_amount_type"), nullable=False, default=PayrollEarningAmountType.MANUAL)
    expense_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)


class PayrollDeductionType(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "payroll_deduction_types"
    __table_args__ = (UniqueConstraint("organization_id", "code", name="uq_payroll_deduction_type_org_code"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    liability_account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    employer_expense_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)


class PayrollPeriod(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "payroll_periods"
    __table_args__ = (
        UniqueConstraint("organization_id", "start_date", "end_date", name="uq_payroll_period_org_dates"),
        CheckConstraint("start_date <= end_date", name="ck_payroll_period_dates_valid"),
        CheckConstraint("pay_date >= start_date", name="ck_payroll_period_pay_date_after_start"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    pay_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[PayrollPeriodStatus] = mapped_column(Enum(PayrollPeriodStatus, name="payroll_period_status"), nullable=False, default=PayrollPeriodStatus.DRAFT)


class PayrollRun(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "payroll_runs"
    __table_args__ = (
        UniqueConstraint("organization_id", "payroll_period_id", name="uq_payroll_run_org_period"),
        CheckConstraint("total_gross >= 0", name="ck_payroll_run_gross_non_negative"),
        CheckConstraint("total_net >= 0", name="ck_payroll_run_net_non_negative"),
        CheckConstraint("total_deductions >= 0", name="ck_payroll_run_deductions_non_negative"),
        CheckConstraint("total_employer_costs >= 0", name="ck_payroll_run_employer_costs_non_negative"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    payroll_period_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payroll_periods.id"), nullable=False, index=True)
    status: Mapped[PayrollRunStatus] = mapped_column(Enum(PayrollRunStatus, name="payroll_run_status"), nullable=False, default=PayrollRunStatus.DRAFT)
    funding_account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    default_expense_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_gross: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    total_net: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    total_deductions: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    total_employer_costs: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    entry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    posted_journal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    calculated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PayrollEntry(Base, UUIDPKMixin):
    __tablename__ = "payroll_entries"
    __table_args__ = (
        UniqueConstraint("payroll_run_id", "employee_id", name="uq_payroll_entry_run_employee"),
        CheckConstraint("gross_pay >= 0", name="ck_payroll_entry_gross_non_negative"),
        CheckConstraint("total_deductions >= 0", name="ck_payroll_entry_deductions_non_negative"),
        CheckConstraint("employer_costs >= 0", name="ck_payroll_entry_employer_costs_non_negative"),
        CheckConstraint("net_pay >= 0", name="ck_payroll_entry_net_non_negative"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    payroll_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payroll_runs.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    gross_pay: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    total_deductions: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    employer_costs: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    net_pay: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PayrollLineItem(Base, UUIDPKMixin):
    __tablename__ = "payroll_line_items"
    __table_args__ = (CheckConstraint("amount >= 0", name="ck_payroll_line_item_amount_non_negative"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    payroll_entry_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payroll_entries.id"), nullable=False, index=True)
    type: Mapped[PayrollLineItemType] = mapped_column(Enum(PayrollLineItemType, name="payroll_line_item_type"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    rate: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    expense_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    liability_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    earning_type_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("payroll_earning_types.id"), nullable=True)
    deduction_type_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("payroll_deduction_types.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
