from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.core.enums import AccountType, ReportRunStatus
from app.schemas.common import ORMModel


class ConsolidationGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    reporting_currency: str = Field(min_length=3, max_length=3)
    description: str | None = Field(default=None, max_length=500)


class ConsolidationGroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    reporting_currency: str | None = Field(default=None, min_length=3, max_length=3)
    description: str | None = Field(default=None, max_length=500)


class GroupEntityCreate(BaseModel):
    organization_id: UUID
    ownership_percentage: Decimal | None = None
    is_primary: bool = False


class ConsolidationGroupResponse(ORMModel):
    id: UUID
    organization_id: UUID
    name: str
    reporting_currency: str
    description: str | None
    created_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime


class GroupEntityResponse(ORMModel):
    id: UUID
    group_id: UUID
    organization_id: UUID
    ownership_percentage: Decimal | None
    is_primary: bool
    created_at: datetime
    updated_at: datetime


class GroupEntityDetailResponse(BaseModel):
    id: UUID
    group_id: UUID
    organization_id: UUID
    organization_name: str
    organization_currency: str
    ownership_percentage: Decimal | None
    is_primary: bool
    created_at: datetime


class ConsolidationFxRateInput(BaseModel):
    organization_id: UUID
    rate: Decimal = Field(gt=Decimal("0"))


class ConsolidationRunCreate(BaseModel):
    period_start: date
    period_end: date
    entity_ids: list[UUID] | None = None
    fx_rates: list[ConsolidationFxRateInput] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.period_end < self.period_start:
            raise ValueError("period_end must be on or after period_start")
        return self


class EliminationJournalLineBase(BaseModel):
    account_code: str = Field(min_length=1, max_length=50)
    account_name: str = Field(min_length=1, max_length=255)
    account_type: AccountType
    debit_amount: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    credit_amount: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    source_organization_id: UUID | None = None
    source_organization_name: str | None = None


class EliminationEntryCreate(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    period_start: date
    period_end: date
    consolidation_run_id: UUID | None = None
    source_entities: list[UUID] = Field(default_factory=list)
    journal_lines: list[EliminationJournalLineBase] = Field(min_length=2)

    @model_validator(mode="after")
    def validate_entry(self):
        if self.period_end < self.period_start:
            raise ValueError("period_end must be on or after period_start")
        debit_total = sum((line.debit_amount for line in self.journal_lines), Decimal("0"))
        credit_total = sum((line.credit_amount for line in self.journal_lines), Decimal("0"))
        if debit_total != credit_total:
            raise ValueError("elimination entries must balance")
        return self


class EliminationLineResponse(EliminationJournalLineBase):
    pass


class EliminationEntryResponse(BaseModel):
    id: UUID
    group_id: UUID
    consolidation_run_id: UUID | None
    description: str
    period_start: date
    period_end: date
    source_entities: list[UUID]
    journal_lines: list[EliminationLineResponse]
    is_manual: bool
    created_by_user_id: UUID | None
    created_at: datetime


class ConsolidationReportMetadata(BaseModel):
    group_id: UUID
    group_name: str
    reporting_currency: str
    period_start: date
    period_end: date
    run_id: UUID | None = None
    generated_at: datetime
    elimination_count: int
    entity_ids: list[UUID]


class ConsolidatedEntityBreakdown(BaseModel):
    organization_id: UUID
    organization_name: str
    amount: Decimal


class ConsolidatedStatementLine(BaseModel):
    account_code: str
    account_name: str
    account_type: AccountType
    amount: Decimal
    entity_breakdown: list[ConsolidatedEntityBreakdown] = Field(default_factory=list)


class ConsolidatedSectionResponse(BaseModel):
    title: str
    lines: list[ConsolidatedStatementLine]
    total: Decimal


class ConsolidatedBalanceSheetResponse(BaseModel):
    metadata: ConsolidationReportMetadata
    assets: ConsolidatedSectionResponse
    liabilities: ConsolidatedSectionResponse
    equity: ConsolidatedSectionResponse
    total_assets: Decimal
    total_liabilities_and_equity: Decimal
    balances: bool


class ConsolidatedIncomeStatementResponse(BaseModel):
    metadata: ConsolidationReportMetadata
    revenue: ConsolidatedSectionResponse
    expenses: ConsolidatedSectionResponse
    net_profit: Decimal


class ConsolidatedTrialBalanceLine(BaseModel):
    account_code: str
    account_name: str
    account_type: AccountType
    debit_balance: Decimal
    credit_balance: Decimal
    entity_breakdown: list[ConsolidatedEntityBreakdown] = Field(default_factory=list)


class ConsolidatedTrialBalanceResponse(BaseModel):
    metadata: ConsolidationReportMetadata
    lines: list[ConsolidatedTrialBalanceLine]
    total_debit: Decimal
    total_credit: Decimal
    balances: bool


class ConsolidationRunResponse(BaseModel):
    id: UUID
    group_id: UUID
    period_start: date
    period_end: date
    status: ReportRunStatus
    created_at: datetime
    completed_at: datetime | None
    selected_entity_ids: list[UUID]
    fx_rates: dict[str, Decimal]
    elimination_summary: dict | None = None
    balance_sheet: ConsolidatedBalanceSheetResponse | None = None
    income_statement: ConsolidatedIncomeStatementResponse | None = None
    trial_balance: ConsolidatedTrialBalanceResponse | None = None


class ConsolidationRunListResponse(BaseModel):
    items: list[ConsolidationRunResponse]


class ConsolidationGroupListResponse(BaseModel):
    items: list[ConsolidationGroupResponse]


class EliminationEntryListResponse(BaseModel):
    items: list[EliminationEntryResponse]
