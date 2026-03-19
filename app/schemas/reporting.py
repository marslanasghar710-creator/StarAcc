from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.core.enums import ReportExportFormat, ReportRunStatus, ReportType
from app.schemas.common import ORMModel


class ReportFilters(BaseModel):
    from_date: date | None = None
    to_date: date | None = None
    as_of_date: date | None = None
    compare_from_date: date | None = None
    compare_to_date: date | None = None
    include_zero_balances: bool | None = None
    account_id: UUID | None = None
    detailed: bool | None = None
    source_module: str | None = None
    accounting_basis: str = "accrual"


class DateRangeReportQuery(BaseModel):
    from_date: date
    to_date: date
    compare_from_date: date | None = None
    compare_to_date: date | None = None
    accounting_basis: str = "accrual"

    @model_validator(mode="after")
    def validate_range(self):
        if self.to_date < self.from_date:
            raise ValueError("to_date must be on or after from_date")
        if (self.compare_from_date is None) ^ (self.compare_to_date is None):
            raise ValueError("compare_from_date and compare_to_date must be provided together")
        if self.compare_from_date and self.compare_to_date and self.compare_to_date < self.compare_from_date:
            raise ValueError("compare_to_date must be on or after compare_from_date")
        if self.accounting_basis != "accrual":
            raise ValueError("Only accrual basis is implemented")
        return self


class AsOfReportQuery(BaseModel):
    as_of_date: date
    accounting_basis: str = "accrual"

    @model_validator(mode="after")
    def validate_basis(self):
        if self.accounting_basis != "accrual":
            raise ValueError("Only accrual basis is implemented")
        return self


class TrialBalanceQuery(AsOfReportQuery):
    include_zero_balances: bool = False


class GeneralLedgerQuery(DateRangeReportQuery):
    account_id: UUID | None = None
    source_module: str | None = None


class AccountStatementQuery(DateRangeReportQuery):
    source_module: str | None = None


class AgingReportQuery(AsOfReportQuery):
    detailed: bool = False


class ExportQuery(BaseModel):
    export_format: ReportExportFormat = ReportExportFormat.CSV


class ReportMetadataResponse(BaseModel):
    report_type: ReportType
    organization_id: UUID
    organization_name: str
    base_currency: str
    generated_at: datetime
    generated_by_user_id: UUID | None = None
    accounting_basis: str


class ReportFilterResponse(BaseModel):
    from_date: date | None = None
    to_date: date | None = None
    as_of_date: date | None = None
    compare_from_date: date | None = None
    compare_to_date: date | None = None
    include_zero_balances: bool | None = None
    account_id: UUID | None = None
    detailed: bool | None = None
    source_module: str | None = None
    export_format: ReportExportFormat | None = None


class ReportExportResponse(BaseModel):
    report_type: ReportType
    export_format: ReportExportFormat
    file_name: str
    generated_at: datetime


class ProfitLossAccountLineResponse(BaseModel):
    account_id: UUID
    code: str
    name: str
    amount: Decimal


class ProfitLossSectionResponse(BaseModel):
    title: str
    lines: list[ProfitLossAccountLineResponse]
    subtotal: Decimal


class ProfitLossComparisonResponse(BaseModel):
    revenue_total: Decimal | None = None
    expense_total: Decimal | None = None
    net_profit: Decimal | None = None


class ProfitLossResponse(BaseModel):
    metadata: ReportMetadataResponse
    filters: ReportFilterResponse
    revenue: ProfitLossSectionResponse
    expenses: ProfitLossSectionResponse
    net_profit: Decimal
    comparison: ProfitLossComparisonResponse | None = None


class BalanceSheetAccountLineResponse(BaseModel):
    account_id: UUID | None = None
    code: str | None = None
    name: str
    amount: Decimal
    is_computed: bool = False


class BalanceSheetSectionResponse(BaseModel):
    title: str
    lines: list[BalanceSheetAccountLineResponse]
    total: Decimal


class BalanceSheetResponse(BaseModel):
    metadata: ReportMetadataResponse
    filters: ReportFilterResponse
    assets: BalanceSheetSectionResponse
    liabilities: BalanceSheetSectionResponse
    equity: BalanceSheetSectionResponse
    total_assets: Decimal
    total_liabilities_and_equity: Decimal
    balances: bool


class TrialBalanceLineResponse(BaseModel):
    account_id: UUID
    code: str
    name: str
    debit_balance: Decimal
    credit_balance: Decimal


class TrialBalanceResponse(BaseModel):
    metadata: ReportMetadataResponse
    filters: ReportFilterResponse
    lines: list[TrialBalanceLineResponse]
    total_debit: Decimal
    total_credit: Decimal
    balances: bool


class GeneralLedgerLineResponse(BaseModel):
    journal_id: UUID
    journal_line_id: UUID
    entry_date: date
    entry_number: str
    source_module: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    description: str | None = None
    debit: Decimal
    credit: Decimal
    running_balance: Decimal


class GeneralLedgerAccountSectionResponse(BaseModel):
    account_id: UUID
    account_code: str
    account_name: str
    normal_balance: str
    opening_balance: Decimal
    movement_total: Decimal
    closing_balance: Decimal
    lines: list[GeneralLedgerLineResponse]


class GeneralLedgerResponse(BaseModel):
    metadata: ReportMetadataResponse
    filters: ReportFilterResponse
    accounts: list[GeneralLedgerAccountSectionResponse]


class AccountStatementLineResponse(BaseModel):
    journal_id: UUID
    journal_line_id: UUID
    entry_date: date
    entry_number: str
    source_module: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    description: str | None = None
    debit: Decimal
    credit: Decimal
    running_balance: Decimal


class AccountStatementResponse(BaseModel):
    metadata: ReportMetadataResponse
    filters: ReportFilterResponse
    account_id: UUID
    account_code: str
    account_name: str
    normal_balance: str
    opening_balance: Decimal
    movement_total: Decimal
    closing_balance: Decimal
    lines: list[AccountStatementLineResponse]


class AgingBucketResponse(BaseModel):
    current: Decimal = Decimal("0")
    days_1_30: Decimal = Field(default=Decimal("0"), alias="1_30_days")
    days_31_60: Decimal = Field(default=Decimal("0"), alias="31_60_days")
    days_61_90: Decimal = Field(default=Decimal("0"), alias="61_90_days")
    over_90_days: Decimal = Decimal("0")

    model_config = {"populate_by_name": True}


class AgedReceivableInvoiceLineResponse(BaseModel):
    invoice_id: UUID
    invoice_number: str
    issue_date: date
    due_date: date
    outstanding_amount: Decimal
    bucket: str


class AgedReceivableCustomerLineResponse(BaseModel):
    customer_id: UUID
    customer_name: str
    buckets: AgingBucketResponse
    total_outstanding: Decimal
    invoice_lines: list[AgedReceivableInvoiceLineResponse] = []
    unapplied_credits: Decimal = Decimal("0")
    unapplied_payments: Decimal = Decimal("0")


class AgedReceivablesResponse(BaseModel):
    metadata: ReportMetadataResponse
    filters: ReportFilterResponse
    customers: list[AgedReceivableCustomerLineResponse]
    totals: AgingBucketResponse
    total_outstanding: Decimal
    unapplied_credits_total: Decimal
    unapplied_payments_total: Decimal


class AgedPayableBillLineResponse(BaseModel):
    bill_id: UUID
    bill_number: str
    issue_date: date
    due_date: date
    outstanding_amount: Decimal
    bucket: str


class AgedPayableSupplierLineResponse(BaseModel):
    supplier_id: UUID
    supplier_name: str
    buckets: AgingBucketResponse
    total_outstanding: Decimal
    bill_lines: list[AgedPayableBillLineResponse] = []
    unapplied_credits: Decimal = Decimal("0")
    unapplied_payments: Decimal = Decimal("0")


class AgedPayablesResponse(BaseModel):
    metadata: ReportMetadataResponse
    filters: ReportFilterResponse
    suppliers: list[AgedPayableSupplierLineResponse]
    totals: AgingBucketResponse
    total_outstanding: Decimal
    unapplied_credits_total: Decimal
    unapplied_payments_total: Decimal


class ReportRunResponse(ORMModel):
    id: UUID
    organization_id: UUID
    report_type: ReportType
    parameters_json: dict
    generated_by_user_id: UUID | None
    generated_at: datetime
    status: ReportRunStatus
    row_count: int | None
    export_format: ReportExportFormat | None


class ReportRunListResponse(BaseModel):
    items: list[ReportRunResponse]


class ReportExportRecordResponse(ORMModel):
    id: UUID
    organization_id: UUID
    report_run_id: UUID | None
    report_type: ReportType
    export_format: ReportExportFormat
    file_name: str | None
    storage_path: str | None
    generated_by_user_id: UUID | None
    generated_at: datetime


class ReportExportListResponse(BaseModel):
    items: list[ReportExportRecordResponse]
