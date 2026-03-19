from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.repositories.tax_rate_repository import TaxRateRepository
from app.repositories.tax_transaction_repository import TaxTransactionRepository
from app.schemas.tax import (
    TaxCalculationPreviewRequest,
    TaxCalculationPreviewResponse,
    TaxCodeCreateRequest,
    TaxCodeListResponse,
    TaxCodeResponse,
    TaxCodeUpdateRequest,
    TaxRateCreateRequest,
    TaxRateListResponse,
    TaxRateResponse,
    TaxRateUpdateRequest,
    TaxReportExportResponse,
    TaxSettingsResponse,
    TaxSettingsUpdateRequest,
    TaxSummaryResponse,
    TaxTransactionListResponse,
    TaxTransactionResponse,
)
from app.services.tax_calculation_service import TaxCalculationService
from app.services.tax_code_service import TaxCodeService
from app.services.tax_export_service import TaxExportService
from app.services.tax_rate_service import TaxRateService
from app.services.tax_settings_service import TaxSettingsService
from app.services.tax_summary_service import TaxSummaryService
from app.core.enums import TaxTransactionDirection
from app.core.exceptions import not_found
from pydantic import BaseModel


class TaxSummaryQuery(BaseModel):
    from_date: date
    to_date: date
    direction: TaxTransactionDirection | None = None
    tax_code_id: UUID | None = None
    report_group: str | None = None


router = APIRouter(prefix="/organizations/{organization_id}/tax", tags=["tax"])


@router.get("/settings", response_model=TaxSettingsResponse)
def get_tax_settings(organization_id: str, _=Depends(require_permission("tax.settings.read")), db: Session = Depends(get_db)):
    return TaxSettingsService(db).get_or_create(organization_id)


@router.patch("/settings", response_model=TaxSettingsResponse)
def update_tax_settings(organization_id: str, payload: TaxSettingsUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("tax.settings.update")), db: Session = Depends(get_db)):
    return TaxSettingsService(db).update(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.post("/rates", response_model=TaxRateResponse)
def create_tax_rate(organization_id: str, payload: TaxRateCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("tax_rates.create")), db: Session = Depends(get_db)):
    return TaxRateService(db).create(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/rates", response_model=TaxRateListResponse)
def list_tax_rates(organization_id: str, q: str | None = Query(None), _=Depends(require_permission("tax_rates.read")), db: Session = Depends(get_db)):
    return TaxRateListResponse(items=TaxRateRepository(db).list(organization_id, q))


@router.get("/rates/{tax_rate_id}", response_model=TaxRateResponse)
def get_tax_rate(organization_id: str, tax_rate_id: str, _=Depends(require_permission("tax_rates.read")), db: Session = Depends(get_db)):
    rate = TaxRateRepository(db).get(organization_id, tax_rate_id)
    if not rate:
        raise not_found("Tax rate not found")
    return rate


@router.patch("/rates/{tax_rate_id}", response_model=TaxRateResponse)
def update_tax_rate(organization_id: str, tax_rate_id: str, payload: TaxRateUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("tax_rates.update")), db: Session = Depends(get_db)):
    return TaxRateService(db).update(organization_id, tax_rate_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/rates/{tax_rate_id}")
def archive_tax_rate(organization_id: str, tax_rate_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("tax_rates.archive")), db: Session = Depends(get_db)):
    TaxRateService(db).archive(organization_id, tax_rate_id, current_user.id)
    return {"message": "archived"}


@router.post("/codes", response_model=TaxCodeResponse)
def create_tax_code(organization_id: str, payload: TaxCodeCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("tax_codes.create")), db: Session = Depends(get_db)):
    return TaxCodeService(db).create(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/codes", response_model=TaxCodeListResponse)
def list_tax_codes(organization_id: str, q: str | None = Query(None), _=Depends(require_permission("tax_codes.read")), db: Session = Depends(get_db)):
    return TaxCodeListResponse(items=TaxCodeService(db).list(organization_id, q))


@router.get("/codes/{tax_code_id}", response_model=TaxCodeResponse)
def get_tax_code(organization_id: str, tax_code_id: str, _=Depends(require_permission("tax_codes.read")), db: Session = Depends(get_db)):
    return TaxCodeService(db).get(organization_id, tax_code_id)


@router.patch("/codes/{tax_code_id}", response_model=TaxCodeResponse)
def update_tax_code(organization_id: str, tax_code_id: str, payload: TaxCodeUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("tax_codes.update")), db: Session = Depends(get_db)):
    return TaxCodeService(db).update(organization_id, tax_code_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/codes/{tax_code_id}")
def archive_tax_code(organization_id: str, tax_code_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("tax_codes.archive")), db: Session = Depends(get_db)):
    TaxCodeService(db).archive(organization_id, tax_code_id, current_user.id)
    return {"message": "archived"}


@router.post("/calculate-preview", response_model=TaxCalculationPreviewResponse)
def calculate_tax_preview(organization_id: str, payload: TaxCalculationPreviewRequest, _=Depends(require_permission("tax_codes.read")), db: Session = Depends(get_db)):
    return TaxCalculationService(db).calculate_preview(organization_id, payload)


@router.get("/reports/summary", response_model=TaxSummaryResponse)
def tax_summary(organization_id: str, from_date: date, to_date: date, direction: TaxTransactionDirection | None = None, tax_code_id: UUID | None = None, report_group: str | None = None, current_user=Depends(get_current_user), _=Depends(require_permission("tax_reports.read")), db: Session = Depends(get_db)):
    query = TaxSummaryQuery(from_date=from_date, to_date=to_date, direction=direction, tax_code_id=tax_code_id, report_group=report_group)
    return TaxSummaryService(db).summary(organization_id, current_user.id, query)


@router.get("/reports/summary/export")
def export_tax_summary(organization_id: str, from_date: date, to_date: date, direction: TaxTransactionDirection | None = None, tax_code_id: UUID | None = None, report_group: str | None = None, export_format: str = Query("csv"), current_user=Depends(get_current_user), _=Depends(require_permission("tax_reports.export")), __=Depends(require_permission("tax_reports.read")), db: Session = Depends(get_db)):
    query = TaxSummaryQuery(from_date=from_date, to_date=to_date, direction=direction, tax_code_id=tax_code_id, report_group=report_group)
    summary = TaxSummaryService(db).summary(organization_id, current_user.id, query)
    return TaxExportService(db).export_summary(organization_id, current_user.id, export_format, summary)


@router.get("/transactions", response_model=TaxTransactionListResponse)
def list_tax_transactions(organization_id: str, from_date: date | None = None, to_date: date | None = None, direction: TaxTransactionDirection | None = None, tax_code_id: UUID | None = None, report_group: str | None = None, _=Depends(require_permission("tax_reports.read")), db: Session = Depends(get_db)):
    return TaxTransactionListResponse(items=[TaxTransactionResponse.model_validate(item) for item in TaxTransactionRepository(db).list(organization_id, from_date=from_date, to_date=to_date, direction=direction, tax_code_id=tax_code_id, report_group=report_group)])
