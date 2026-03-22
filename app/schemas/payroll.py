from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import (
    EmployeeStatus,
    EmploymentType,
    PayrollEarningAmountType,
    PayrollLineItemType,
    PayrollPeriodStatus,
    PayrollRunStatus,
)
from app.schemas.common import ORMModel


class EmployeeCreateRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    employment_type: EmploymentType
    start_date: date
    end_date: date | None = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    default_salary_amount: Decimal | None = Field(default=None, ge=0)
    default_hourly_rate: Decimal | None = Field(default=None, ge=0)
    payroll_expense_account_id: UUID | None = None
    payroll_settings_json: dict | None = None


class EmployeeUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    employment_type: EmploymentType | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: EmployeeStatus | None = None
    default_salary_amount: Decimal | None = Field(default=None, ge=0)
    default_hourly_rate: Decimal | None = Field(default=None, ge=0)
    payroll_expense_account_id: UUID | None = None
    payroll_settings_json: dict | None = None


class EmployeeResponse(ORMModel):
    id: UUID
    organization_id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    employment_type: EmploymentType
    status: EmployeeStatus
    start_date: date
    end_date: date | None
    default_salary_amount: Decimal | None
    default_hourly_rate: Decimal | None
    payroll_expense_account_id: UUID | None
    payroll_settings_json: dict | None


class EmployeeListResponse(BaseModel):
    items: list[EmployeeResponse]


class PayrollEarningTypeCreateRequest(BaseModel):
    code: str
    name: str
    amount_type: PayrollEarningAmountType = PayrollEarningAmountType.MANUAL
    expense_account_id: UUID | None = None
    is_active: bool = True


class PayrollEarningTypeUpdateRequest(BaseModel):
    name: str | None = None
    amount_type: PayrollEarningAmountType | None = None
    expense_account_id: UUID | None = None
    is_active: bool | None = None


class PayrollEarningTypeResponse(ORMModel):
    id: UUID
    organization_id: UUID
    code: str
    name: str
    amount_type: PayrollEarningAmountType
    expense_account_id: UUID | None
    is_active: bool


class PayrollEarningTypeListResponse(BaseModel):
    items: list[PayrollEarningTypeResponse]


class PayrollDeductionTypeCreateRequest(BaseModel):
    code: str
    name: str
    liability_account_id: UUID
    employer_expense_account_id: UUID | None = None
    is_active: bool = True


class PayrollDeductionTypeUpdateRequest(BaseModel):
    name: str | None = None
    liability_account_id: UUID | None = None
    employer_expense_account_id: UUID | None = None
    is_active: bool | None = None


class PayrollDeductionTypeResponse(ORMModel):
    id: UUID
    organization_id: UUID
    code: str
    name: str
    liability_account_id: UUID
    employer_expense_account_id: UUID | None
    is_active: bool


class PayrollDeductionTypeListResponse(BaseModel):
    items: list[PayrollDeductionTypeResponse]


class PayrollPeriodCreateRequest(BaseModel):
    start_date: date
    end_date: date
    pay_date: date


class PayrollPeriodResponse(ORMModel):
    id: UUID
    organization_id: UUID
    start_date: date
    end_date: date
    pay_date: date
    status: PayrollPeriodStatus


class PayrollPeriodListResponse(BaseModel):
    items: list[PayrollPeriodResponse]


class PayrollRunCreateRequest(BaseModel):
    payroll_period_id: UUID
    funding_account_id: UUID
    default_expense_account_id: UUID | None = None
    reference: str | None = None
    notes: str | None = None


class PayrollEmployeeEarningInput(BaseModel):
    earning_type_id: UUID | None = None
    name: str | None = None
    amount: Decimal = Field(ge=0)
    quantity: Decimal | None = Field(default=None, ge=0)
    rate: Decimal | None = Field(default=None, ge=0)


class PayrollEmployeeDeductionInput(BaseModel):
    deduction_type_id: UUID
    employee_amount: Decimal = Field(default=Decimal("0"), ge=0)
    employer_amount: Decimal = Field(default=Decimal("0"), ge=0)


class PayrollEmployeeInput(BaseModel):
    employee_id: UUID
    salary_override: Decimal | None = Field(default=None, ge=0)
    hours_worked: Decimal | None = Field(default=None, ge=0)
    hourly_rate_override: Decimal | None = Field(default=None, ge=0)
    additional_earnings: list[PayrollEmployeeEarningInput] = Field(default_factory=list)
    deductions: list[PayrollEmployeeDeductionInput] = Field(default_factory=list)


class PayrollRunCalculateRequest(BaseModel):
    employee_inputs: list[PayrollEmployeeInput] = Field(default_factory=list)


class PayrollRunResponse(ORMModel):
    id: UUID
    organization_id: UUID
    payroll_period_id: UUID
    status: PayrollRunStatus
    funding_account_id: UUID
    default_expense_account_id: UUID | None
    reference: str | None
    notes: str | None
    total_gross: Decimal
    total_net: Decimal
    total_deductions: Decimal
    total_employer_costs: Decimal
    entry_count: int
    posted_journal_id: UUID | None
    calculated_at: datetime | None
    posted_at: datetime | None


class PayrollRunListResponse(BaseModel):
    items: list[PayrollRunResponse]


class PayrollLineItemResponse(ORMModel):
    id: UUID
    payroll_entry_id: UUID
    type: PayrollLineItemType
    name: str
    amount: Decimal
    quantity: Decimal | None
    rate: Decimal | None
    expense_account_id: UUID | None
    liability_account_id: UUID | None
    earning_type_id: UUID | None
    deduction_type_id: UUID | None


class PayrollEntryResponse(ORMModel):
    id: UUID
    organization_id: UUID
    payroll_run_id: UUID
    employee_id: UUID
    gross_pay: Decimal
    total_deductions: Decimal
    employer_costs: Decimal
    net_pay: Decimal
    created_at: datetime


class PayrollEntryDetailResponse(BaseModel):
    entry: PayrollEntryResponse
    line_items: list[PayrollLineItemResponse]


class PayrollEntryListResponse(BaseModel):
    items: list[PayrollEntryResponse]


class PayrollSummaryItemResponse(BaseModel):
    payroll_run_id: UUID
    payroll_period_id: UUID
    period_start_date: date
    period_end_date: date
    pay_date: date
    status: PayrollRunStatus
    total_gross: Decimal
    total_net: Decimal
    total_deductions: Decimal
    total_employer_costs: Decimal
    entry_count: int


class PayrollSummaryResponse(BaseModel):
    items: list[PayrollSummaryItemResponse]


class PayrollLiabilityItemResponse(BaseModel):
    name: str
    liability_account_id: UUID
    amount: Decimal


class PayrollLiabilitiesResponse(BaseModel):
    items: list[PayrollLiabilityItemResponse]
