from datetime import date

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.schemas.consolidation import (
    ConsolidatedBalanceSheetResponse,
    ConsolidatedIncomeStatementResponse,
    ConsolidatedTrialBalanceResponse,
    ConsolidationGroupCreate,
    ConsolidationGroupListResponse,
    ConsolidationGroupResponse,
    ConsolidationGroupUpdate,
    ConsolidationRunCreate,
    ConsolidationRunListResponse,
    ConsolidationRunResponse,
    EliminationEntryCreate,
    EliminationEntryListResponse,
    EliminationEntryResponse,
    GroupEntityCreate,
)
from app.services.reporting.consolidation_service import ConsolidationService

router = APIRouter(tags=["consolidation"])


@router.post("/organizations/{organization_id}/groups", response_model=ConsolidationGroupResponse)
def create_group(
    organization_id: str,
    payload: ConsolidationGroupCreate,
    current_user=Depends(get_current_user),
    _=Depends(require_permission("consolidation.manage")),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).create_group(organization_id, current_user.id, payload)


@router.get("/organizations/{organization_id}/groups", response_model=ConsolidationGroupListResponse)
def list_groups(
    organization_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("consolidation.read")),
    db: Session = Depends(get_db),
):
    items, total = ConsolidationService(db).list_groups(organization_id, current_user.id, limit=limit, offset=offset)
    return ConsolidationGroupListResponse(items=items, pagination={"limit": limit, "offset": offset, "total": total})


@router.get("/organizations/{organization_id}/groups/{group_id}", response_model=ConsolidationGroupResponse)
def get_group(
    organization_id: str,
    group_id: str,
    current_user=Depends(get_current_user),
    _=Depends(require_permission("consolidation.read")),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).get_group(organization_id, group_id, current_user.id)


@router.patch("/organizations/{organization_id}/groups/{group_id}", response_model=ConsolidationGroupResponse)
def update_group(
    organization_id: str,
    group_id: str,
    payload: ConsolidationGroupUpdate,
    current_user=Depends(get_current_user),
    _=Depends(require_permission("consolidation.manage")),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).update_group(organization_id, group_id, current_user.id, payload)


@router.post("/groups/{group_id}/entities")
def add_group_entity(
    group_id: str,
    payload: GroupEntityCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).add_group_entity(group_id, current_user.id, payload)


@router.get("/groups/{group_id}/entities")
def list_group_entities(
    group_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).list_group_entities(group_id, current_user.id)


@router.delete("/groups/{group_id}/entities/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group_entity(
    group_id: str,
    entity_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ConsolidationService(db).remove_group_entity(group_id, entity_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/groups/{group_id}/consolidations/run", response_model=ConsolidationRunResponse)
def run_consolidation(
    group_id: str,
    payload: ConsolidationRunCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).run_consolidation(group_id, current_user.id, payload)


@router.get("/groups/{group_id}/consolidations", response_model=ConsolidationRunListResponse)
def list_consolidations(
    group_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = ConsolidationService(db).list_runs(group_id, current_user.id, limit=limit, offset=offset)
    return ConsolidationRunListResponse(items=items, pagination={"limit": limit, "offset": offset, "total": total})


@router.get("/groups/{group_id}/consolidations/{run_id}", response_model=ConsolidationRunResponse)
def get_consolidation(
    group_id: str,
    run_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).get_run(group_id, run_id, current_user.id)


@router.get("/groups/{group_id}/eliminations", response_model=EliminationEntryListResponse)
def list_eliminations(
    group_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = ConsolidationService(db).list_eliminations(group_id, current_user.id, limit=limit, offset=offset)
    return EliminationEntryListResponse(items=items, pagination={"limit": limit, "offset": offset, "total": total})


@router.post("/groups/{group_id}/eliminations", response_model=EliminationEntryResponse)
def create_elimination(
    group_id: str,
    payload: EliminationEntryCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).create_elimination_entry(group_id, current_user.id, payload)


@router.get("/groups/{group_id}/eliminations/{elimination_id}", response_model=EliminationEntryResponse)
def get_elimination(
    group_id: str,
    elimination_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).get_elimination(group_id, elimination_id, current_user.id)


@router.get("/groups/{group_id}/reports/balance-sheet", response_model=ConsolidatedBalanceSheetResponse)
def consolidated_balance_sheet(
    group_id: str,
    run_id: str | None = Query(None),
    period_start: date | None = Query(None),
    period_end: date | None = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).get_balance_sheet(group_id, current_user.id, run_id=run_id, period_start=period_start, period_end=period_end)


@router.get("/groups/{group_id}/reports/income-statement", response_model=ConsolidatedIncomeStatementResponse)
def consolidated_income_statement(
    group_id: str,
    run_id: str | None = Query(None),
    period_start: date | None = Query(None),
    period_end: date | None = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).get_income_statement(group_id, current_user.id, run_id=run_id, period_start=period_start, period_end=period_end)


@router.get("/groups/{group_id}/reports/trial-balance", response_model=ConsolidatedTrialBalanceResponse)
def consolidated_trial_balance(
    group_id: str,
    run_id: str | None = Query(None),
    period_start: date | None = Query(None),
    period_end: date | None = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ConsolidationService(db).get_trial_balance(group_id, current_user.id, run_id=run_id, period_start=period_start, period_end=period_end)
