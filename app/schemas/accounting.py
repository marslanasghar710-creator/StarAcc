from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.core.enums import AccountType, JournalStatus, NormalBalance, PeriodStatus
from app.schemas.common import ORMModel


class AccountCreateRequest(BaseModel):
    code: str
    name: str
    description: str | None = None
    account_type: AccountType
    account_subtype: str | None = None
    normal_balance: NormalBalance | None = None
    parent_account_id: UUID | None = None
    currency_code: str | None = None
    is_postable: bool = True


class AccountUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    account_subtype: str | None = None
    parent_account_id: UUID | None = None
    currency_code: str | None = None
    is_active: bool | None = None
    is_postable: bool | None = None


class AccountResponse(ORMModel):
    id: UUID
    organization_id: UUID
    code: str
    name: str
    description: str | None
    account_type: AccountType
    account_subtype: str | None
    normal_balance: NormalBalance
    parent_account_id: UUID | None
    currency_code: str | None
    is_active: bool
    is_postable: bool
    is_system: bool


class AccountListResponse(BaseModel):
    items: list[AccountResponse]


class AccountBalanceResponse(BaseModel):
    account_id: UUID
    closing_debit: Decimal
    closing_credit: Decimal


class AccountLedgerLineResponse(BaseModel):
    journal_id: UUID
    entry_number: str
    entry_date: date
    description: str | None
    debit_amount: Decimal
    credit_amount: Decimal


class JournalLineCreateRequest(BaseModel):
    account_id: UUID
    description: str | None = None
    debit_amount: Decimal = Decimal("0")
    credit_amount: Decimal = Decimal("0")
    currency_code: str = "USD"
    exchange_rate: Decimal | None = None

    @model_validator(mode="after")
    def validate_amounts(self):
        if self.debit_amount > 0 and self.credit_amount > 0:
            raise ValueError("debit and credit cannot both be positive")
        if self.debit_amount <= 0 and self.credit_amount <= 0:
            raise ValueError("one of debit or credit must be positive")
        return self


class JournalCreateRequest(BaseModel):
    entry_date: date
    description: str
    reference: str | None = None
    source_module: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    lines: list[JournalLineCreateRequest] = Field(min_length=2)


class JournalUpdateRequest(BaseModel):
    description: str | None = None
    reference: str | None = None
    lines: list[JournalLineCreateRequest] | None = None


class JournalLineResponse(ORMModel):
    id: UUID
    line_number: int
    account_id: UUID
    description: str | None
    debit_amount: Decimal
    credit_amount: Decimal
    base_debit_amount: Decimal
    base_credit_amount: Decimal


class JournalResponse(ORMModel):
    id: UUID
    organization_id: UUID
    entry_number: str
    entry_date: date
    description: str
    status: JournalStatus
    period_id: UUID
    posted_at: datetime | None


class JournalListResponse(BaseModel):
    items: list[JournalResponse]


class JournalPostResponse(BaseModel):
    journal_id: UUID
    status: JournalStatus


class JournalReverseRequest(BaseModel):
    reversal_date: date
    reason: str


class JournalVoidRequest(BaseModel):
    reason: str


class FinancialPeriodCreateRequest(BaseModel):
    name: str
    start_date: date
    end_date: date
    fiscal_year: int
    period_number: int


class FinancialPeriodUpdateRequest(BaseModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class FinancialPeriodResponse(ORMModel):
    id: UUID
    organization_id: UUID
    name: str
    start_date: date
    end_date: date
    fiscal_year: int
    period_number: int
    status: PeriodStatus


class FinancialPeriodListResponse(BaseModel):
    items: list[FinancialPeriodResponse]


class LedgerEntryResponse(BaseModel):
    journal_id: UUID
    entry_number: str
    entry_date: date
    account_id: UUID
    account_code: str
    account_name: str
    debit_amount: Decimal
    credit_amount: Decimal


class TrialBalanceLineResponse(BaseModel):
    account_id: UUID
    code: str
    name: str
    debit_balance: Decimal
    credit_balance: Decimal


class TrialBalanceResponse(BaseModel):
    lines: list[TrialBalanceLineResponse]
    total_debit: Decimal
    total_credit: Decimal
