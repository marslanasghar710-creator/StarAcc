from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.schemas.custom_reporting import (
    CustomReportDatasetResponse,
    CustomReportDatasetSummaryResponse,
    CustomReportDefinitionCreate,
    CustomReportDefinitionListResponse,
    CustomReportDefinitionResponse,
    CustomReportExportRequest,
    CustomReportPreviewRequest,
    CustomReportResultResponse,
    CustomReportDefinitionUpdate,
    CustomReportFieldResponse,
)
from app.schemas.reporting import (
    AccountStatementQuery,
    AccountStatementResponse,
    AgingReportQuery,
    AsOfReportQuery,
    BalanceSheetResponse,
    DateRangeReportQuery,
    ExportQuery,
    GeneralLedgerQuery,
    GeneralLedgerResponse,
    ProfitLossResponse,
    ReportExportListResponse,
    ReportExportRecordResponse,
    ReportRunListResponse,
    ReportRunResponse,
    TrialBalanceQuery,
    TrialBalanceResponse,
    AgedReceivablesResponse,
    AgedPayablesResponse,
)
from app.services.reporting.account_statement_service import AccountStatementService
from app.services.reporting.aged_payables_service import AgedPayablesService
from app.services.reporting.aged_receivables_service import AgedReceivablesService
from app.services.reporting.balance_sheet_service import BalanceSheetService
from app.services.reporting.general_ledger_service import GeneralLedgerService
from app.services.reporting.profit_loss_service import ProfitLossService
from app.services.reporting.report_context_service import ReportContextService
from app.services.reporting.report_export_service import ReportExportService
from app.services.reporting.custom_reporting_service import CustomReportingService
from app.services.reporting.trial_balance_service import TrialBalanceService
from app.core.enums import ReportType

router = APIRouter(prefix="/organizations/{organization_id}", tags=["reporting"])


@router.get("/reports/profit-loss", response_model=ProfitLossResponse)
def profit_loss(
    organization_id: str,
    from_date: str = Query(...),
    to_date: str = Query(...),
    compare_from_date: str | None = Query(None),
    compare_to_date: str | None = Query(None),
    accounting_basis: str = Query("accrual"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.profit_loss.read")),
    db: Session = Depends(get_db),
):
    query = DateRangeReportQuery(from_date=from_date, to_date=to_date, compare_from_date=compare_from_date, compare_to_date=compare_to_date, accounting_basis=accounting_basis)
    return ProfitLossService(db).generate(organization_id, query, current_user.id)


@router.get("/reports/profit-loss/export")
def export_profit_loss(
    organization_id: str,
    from_date: str = Query(...),
    to_date: str = Query(...),
    compare_from_date: str | None = Query(None),
    compare_to_date: str | None = Query(None),
    accounting_basis: str = Query("accrual"),
    export_format: str = Query("csv"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.export")),
    __=Depends(require_permission("reports.profit_loss.read")),
    db: Session = Depends(get_db),
):
    query = DateRangeReportQuery(from_date=from_date, to_date=to_date, compare_from_date=compare_from_date, compare_to_date=compare_to_date, accounting_basis=accounting_basis)
    report = ProfitLossService(db).generate(organization_id, query, current_user.id)
    return ReportExportService(db).export(organization_id=organization_id, report_type=ReportType.PROFIT_LOSS, export_format=ExportQuery(export_format=export_format).export_format, file_stem="profit-loss", payload=report, generated_by_user_id=current_user.id)


@router.get("/reports/balance-sheet", response_model=BalanceSheetResponse)
def balance_sheet(
    organization_id: str,
    as_of_date: str = Query(...),
    accounting_basis: str = Query("accrual"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.balance_sheet.read")),
    db: Session = Depends(get_db),
):
    query = AsOfReportQuery(as_of_date=as_of_date, accounting_basis=accounting_basis)
    return BalanceSheetService(db).generate(organization_id, query, current_user.id)


@router.get("/reports/balance-sheet/export")
def export_balance_sheet(
    organization_id: str,
    as_of_date: str = Query(...),
    accounting_basis: str = Query("accrual"),
    export_format: str = Query("csv"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.export")),
    __=Depends(require_permission("reports.balance_sheet.read")),
    db: Session = Depends(get_db),
):
    query = AsOfReportQuery(as_of_date=as_of_date, accounting_basis=accounting_basis)
    report = BalanceSheetService(db).generate(organization_id, query, current_user.id)
    return ReportExportService(db).export(organization_id=organization_id, report_type=ReportType.BALANCE_SHEET, export_format=ExportQuery(export_format=export_format).export_format, file_stem="balance-sheet", payload=report, generated_by_user_id=current_user.id)


@router.get("/reports/trial-balance", response_model=TrialBalanceResponse)
def trial_balance(
    organization_id: str,
    as_of_date: str = Query(...),
    include_zero_balances: bool = Query(False),
    accounting_basis: str = Query("accrual"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.trial_balance.read")),
    db: Session = Depends(get_db),
):
    query = TrialBalanceQuery(as_of_date=as_of_date, include_zero_balances=include_zero_balances, accounting_basis=accounting_basis)
    return TrialBalanceService(db).generate(organization_id, query, current_user.id)


@router.get("/reports/trial-balance/export")
def export_trial_balance(
    organization_id: str,
    as_of_date: str = Query(...),
    include_zero_balances: bool = Query(False),
    accounting_basis: str = Query("accrual"),
    export_format: str = Query("csv"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.export")),
    __=Depends(require_permission("reports.trial_balance.read")),
    db: Session = Depends(get_db),
):
    query = TrialBalanceQuery(as_of_date=as_of_date, include_zero_balances=include_zero_balances, accounting_basis=accounting_basis)
    report = TrialBalanceService(db).generate(organization_id, query, current_user.id)
    return ReportExportService(db).export(organization_id=organization_id, report_type=ReportType.TRIAL_BALANCE, export_format=ExportQuery(export_format=export_format).export_format, file_stem="trial-balance", payload=report, generated_by_user_id=current_user.id)


@router.get("/reports/general-ledger", response_model=GeneralLedgerResponse)
def general_ledger(
    organization_id: str,
    from_date: str = Query(...),
    to_date: str = Query(...),
    account_id: str | None = Query(None),
    source_module: str | None = Query(None),
    accounting_basis: str = Query("accrual"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.general_ledger.read")),
    db: Session = Depends(get_db),
):
    query = GeneralLedgerQuery(from_date=from_date, to_date=to_date, account_id=account_id, source_module=source_module, accounting_basis=accounting_basis)
    return GeneralLedgerService(db).generate(organization_id, query, current_user.id)


@router.get("/reports/general-ledger/export")
def export_general_ledger(
    organization_id: str,
    from_date: str = Query(...),
    to_date: str = Query(...),
    account_id: str | None = Query(None),
    source_module: str | None = Query(None),
    accounting_basis: str = Query("accrual"),
    export_format: str = Query("csv"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.export")),
    __=Depends(require_permission("reports.general_ledger.read")),
    db: Session = Depends(get_db),
):
    query = GeneralLedgerQuery(from_date=from_date, to_date=to_date, account_id=account_id, source_module=source_module, accounting_basis=accounting_basis)
    report = GeneralLedgerService(db).generate(organization_id, query, current_user.id)
    return ReportExportService(db).export(organization_id=organization_id, report_type=ReportType.GENERAL_LEDGER, export_format=ExportQuery(export_format=export_format).export_format, file_stem="general-ledger", payload=report, generated_by_user_id=current_user.id)


@router.get("/reports/accounts/{account_id}/statement", response_model=AccountStatementResponse)
def account_statement(
    organization_id: str,
    account_id: str,
    from_date: str = Query(...),
    to_date: str = Query(...),
    source_module: str | None = Query(None),
    accounting_basis: str = Query("accrual"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.account_statement.read")),
    db: Session = Depends(get_db),
):
    query = AccountStatementQuery(from_date=from_date, to_date=to_date, source_module=source_module, accounting_basis=accounting_basis)
    return AccountStatementService(db).generate(organization_id, account_id, query, current_user.id)


@router.get("/reports/accounts/{account_id}/statement/export")
def export_account_statement(
    organization_id: str,
    account_id: str,
    from_date: str = Query(...),
    to_date: str = Query(...),
    source_module: str | None = Query(None),
    accounting_basis: str = Query("accrual"),
    export_format: str = Query("csv"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.export")),
    __=Depends(require_permission("reports.account_statement.read")),
    db: Session = Depends(get_db),
):
    query = AccountStatementQuery(from_date=from_date, to_date=to_date, source_module=source_module, accounting_basis=accounting_basis)
    report = AccountStatementService(db).generate(organization_id, account_id, query, current_user.id)
    return ReportExportService(db).export(organization_id=organization_id, report_type=ReportType.ACCOUNT_STATEMENT, export_format=ExportQuery(export_format=export_format).export_format, file_stem="account-statement", payload=report, generated_by_user_id=current_user.id)


@router.get("/reports/aged-receivables", response_model=AgedReceivablesResponse)
def aged_receivables(
    organization_id: str,
    as_of_date: str = Query(...),
    detailed: bool = Query(False),
    accounting_basis: str = Query("accrual"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.aged_receivables.read")),
    db: Session = Depends(get_db),
):
    query = AgingReportQuery(as_of_date=as_of_date, detailed=detailed, accounting_basis=accounting_basis)
    return AgedReceivablesService(db).generate(organization_id, query, current_user.id)


@router.get("/reports/aged-receivables/export")
def export_aged_receivables(
    organization_id: str,
    as_of_date: str = Query(...),
    detailed: bool = Query(False),
    accounting_basis: str = Query("accrual"),
    export_format: str = Query("csv"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.export")),
    __=Depends(require_permission("reports.aged_receivables.read")),
    db: Session = Depends(get_db),
):
    query = AgingReportQuery(as_of_date=as_of_date, detailed=detailed, accounting_basis=accounting_basis)
    report = AgedReceivablesService(db).generate(organization_id, query, current_user.id)
    return ReportExportService(db).export(organization_id=organization_id, report_type=ReportType.AGED_RECEIVABLES, export_format=ExportQuery(export_format=export_format).export_format, file_stem="aged-receivables", payload=report, generated_by_user_id=current_user.id)


@router.get("/reports/aged-payables", response_model=AgedPayablesResponse)
def aged_payables(
    organization_id: str,
    as_of_date: str = Query(...),
    detailed: bool = Query(False),
    accounting_basis: str = Query("accrual"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.aged_payables.read")),
    db: Session = Depends(get_db),
):
    query = AgingReportQuery(as_of_date=as_of_date, detailed=detailed, accounting_basis=accounting_basis)
    return AgedPayablesService(db).generate(organization_id, query, current_user.id)


@router.get("/reports/aged-payables/export")
def export_aged_payables(
    organization_id: str,
    as_of_date: str = Query(...),
    detailed: bool = Query(False),
    accounting_basis: str = Query("accrual"),
    export_format: str = Query("csv"),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.export")),
    __=Depends(require_permission("reports.aged_payables.read")),
    db: Session = Depends(get_db),
):
    query = AgingReportQuery(as_of_date=as_of_date, detailed=detailed, accounting_basis=accounting_basis)
    report = AgedPayablesService(db).generate(organization_id, query, current_user.id)
    return ReportExportService(db).export(organization_id=organization_id, report_type=ReportType.AGED_PAYABLES, export_format=ExportQuery(export_format=export_format).export_format, file_stem="aged-payables", payload=report, generated_by_user_id=current_user.id)


@router.get("/custom-reports/datasets", response_model=list[CustomReportDatasetSummaryResponse])
def list_custom_report_datasets(
    organization_id: str,
    membership=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    return CustomReportingService(db).list_datasets(organization_id, membership.role_id)


@router.get("/custom-reports/datasets/{dataset_id}", response_model=CustomReportDatasetResponse)
def get_custom_report_dataset(
    organization_id: str,
    dataset_id: str,
    membership=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    return CustomReportingService(db).get_dataset(organization_id, membership.role_id, dataset_id)


@router.get("/custom-reports/datasets/{dataset_id}/fields", response_model=list[CustomReportFieldResponse])
def get_custom_report_dataset_fields(
    organization_id: str,
    dataset_id: str,
    membership=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    dataset = CustomReportingService(db).get_dataset(organization_id, membership.role_id, dataset_id)
    return dataset.fields


@router.get("/custom-reports/datasets/{dataset_id}/filters", response_model=list[CustomReportFieldResponse])
def get_custom_report_dataset_filters(
    organization_id: str,
    dataset_id: str,
    membership=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    dataset = CustomReportingService(db).get_dataset(organization_id, membership.role_id, dataset_id)
    return dataset.supported_filters


@router.get("/custom-reports/datasets/{dataset_id}/groupings", response_model=list[CustomReportFieldResponse])
def get_custom_report_dataset_groupings(
    organization_id: str,
    dataset_id: str,
    membership=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    dataset = CustomReportingService(db).get_dataset(organization_id, membership.role_id, dataset_id)
    return dataset.supported_groupings


@router.get("/custom-reports", response_model=CustomReportDefinitionListResponse)
def list_custom_reports(
    organization_id: str,
    _=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    return CustomReportDefinitionListResponse(items=CustomReportingService(db).list_definitions(organization_id))


@router.post("/custom-reports", response_model=CustomReportDefinitionResponse)
def create_custom_report(
    organization_id: str,
    payload: CustomReportDefinitionCreate,
    current_user=Depends(get_current_user),
    membership=Depends(require_permission("reports.custom.create")),
    db: Session = Depends(get_db),
):
    return CustomReportingService(db).create_definition(organization_id, membership.role_id, current_user.id, payload)


@router.get("/custom-reports/{report_id}", response_model=CustomReportDefinitionResponse)
def get_custom_report(
    organization_id: str,
    report_id: str,
    _=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    return CustomReportingService(db).get_definition(organization_id, report_id)


@router.patch("/custom-reports/{report_id}", response_model=CustomReportDefinitionResponse)
def update_custom_report(
    organization_id: str,
    report_id: str,
    payload: CustomReportDefinitionUpdate,
    current_user=Depends(get_current_user),
    membership=Depends(require_permission("reports.custom.update")),
    db: Session = Depends(get_db),
):
    return CustomReportingService(db).update_definition(organization_id, membership.role_id, report_id, current_user.id, payload)


@router.delete("/custom-reports/{report_id}", status_code=204)
def delete_custom_report(
    organization_id: str,
    report_id: str,
    current_user=Depends(get_current_user),
    _=Depends(require_permission("reports.custom.delete")),
    db: Session = Depends(get_db),
):
    CustomReportingService(db).delete_definition(organization_id, report_id, current_user.id)


@router.post("/custom-reports/preview", response_model=CustomReportResultResponse)
def preview_custom_report(
    organization_id: str,
    payload: CustomReportPreviewRequest,
    current_user=Depends(get_current_user),
    membership=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    return CustomReportingService(db).execute_preview(
        organization_id=organization_id,
        role_id=membership.role_id,
        requested_by_user_id=current_user.id,
        requested_by_email=current_user.email,
        payload=payload,
    )


@router.post("/custom-reports/preview/export")
def export_custom_report_preview(
    organization_id: str,
    payload: CustomReportExportRequest,
    current_user=Depends(get_current_user),
    membership=Depends(require_permission("reports.export")),
    __=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    return CustomReportingService(db).export_preview(organization_id, membership.role_id, current_user.id, current_user.email, payload)


@router.post("/custom-reports/{report_id}/run", response_model=CustomReportResultResponse)
def run_custom_report(
    organization_id: str,
    report_id: str,
    current_user=Depends(get_current_user),
    membership=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    return CustomReportingService(db).run_definition(organization_id, membership.role_id, report_id, current_user.id, current_user.email)


@router.get("/custom-reports/{report_id}/results", response_model=CustomReportResultResponse)
def latest_custom_report_results(
    organization_id: str,
    report_id: str,
    current_user=Depends(get_current_user),
    membership=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    return CustomReportingService(db).latest_results(organization_id, membership.role_id, report_id, current_user.id, current_user.email)


@router.post("/custom-reports/{report_id}/export")
def export_custom_report(
    organization_id: str,
    report_id: str,
    payload: CustomReportExportRequest,
    current_user=Depends(get_current_user),
    membership=Depends(require_permission("reports.export")),
    __=Depends(require_permission("reports.custom.read")),
    db: Session = Depends(get_db),
):
    return CustomReportingService(db).export_definition(organization_id, membership.role_id, report_id, current_user.id, current_user.email, payload)


@router.get("/report-runs", response_model=ReportRunListResponse)
def list_report_runs(
    organization_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _=Depends(require_permission("reports.general_ledger.read")),
    db: Session = Depends(get_db),
):
    items, total = ReportContextService(db).list_runs(organization_id, limit=limit, offset=offset)
    return ReportRunListResponse(items=[ReportRunResponse.model_validate(item) for item in items], pagination={"limit": limit, "offset": offset, "total": total})


@router.get("/report-runs/{report_run_id}", response_model=ReportRunResponse)
def get_report_run(
    organization_id: str,
    report_run_id: str,
    _=Depends(require_permission("reports.general_ledger.read")),
    db: Session = Depends(get_db),
):
    return ReportRunResponse.model_validate(ReportContextService(db).get_run(organization_id, report_run_id))


@router.get("/report-exports", response_model=ReportExportListResponse)
def list_report_exports(
    organization_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _=Depends(require_permission("reports.export")),
    db: Session = Depends(get_db),
):
    items, total = ReportContextService(db).list_exports(organization_id, limit=limit, offset=offset)
    return ReportExportListResponse(items=[ReportExportRecordResponse.model_validate(item) for item in items], pagination={"limit": limit, "offset": offset, "total": total})


@router.get("/report-exports/{export_id}", response_model=ReportExportRecordResponse)
def get_report_export(
    organization_id: str,
    export_id: str,
    _=Depends(require_permission("reports.export")),
    db: Session = Depends(get_db),
):
    return ReportExportRecordResponse.model_validate(ReportContextService(db).get_export(organization_id, export_id))
