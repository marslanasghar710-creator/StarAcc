from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.schemas.inventory import (
    InventoryAdjustmentCreateRequest,
    InventoryAdjustmentListResponse,
    InventoryAdjustmentResponse,
    InventoryBalanceListResponse,
    InventoryBalanceResponse,
    InventoryLocationCreateRequest,
    InventoryLocationListResponse,
    InventoryLocationResponse,
    InventoryLocationUpdateRequest,
    InventoryMovementListResponse,
    InventoryValuationSummaryResponse,
    ItemCreateRequest,
    ItemListResponse,
    ItemResponse,
    ItemUpdateRequest,
)
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/organizations/{organization_id}", tags=["inventory"])


@router.post("/items", response_model=ItemResponse)
def create_item(organization_id: str, payload: ItemCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("inventory.create")), db: Session = Depends(get_db)):
    return InventoryService(db).create_item(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/items", response_model=ItemListResponse)
def list_items(organization_id: str, q: str | None = Query(None), active_only: bool | None = Query(None), _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return ItemListResponse(items=InventoryService(db).list_items(organization_id, search=q, active_only=active_only))


@router.get("/items/search", response_model=ItemListResponse)
def search_items(organization_id: str, q: str = Query(""), _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return ItemListResponse(items=InventoryService(db).list_items(organization_id, search=q))


@router.get("/items/{item_id}", response_model=ItemResponse)
def get_item(organization_id: str, item_id: UUID, _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return InventoryService(db).get_item(organization_id, item_id)


@router.patch("/items/{item_id}", response_model=ItemResponse)
def update_item(organization_id: str, item_id: UUID, payload: ItemUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("inventory.update")), db: Session = Depends(get_db)):
    return InventoryService(db).update_item(organization_id, item_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/items/{item_id}")
def archive_item(organization_id: str, item_id: UUID, current_user=Depends(get_current_user), _=Depends(require_permission("inventory.update")), db: Session = Depends(get_db)):
    InventoryService(db).archive_item(organization_id, item_id, current_user.id)
    return {"message": "archived"}


@router.post("/inventory/locations", response_model=InventoryLocationResponse)
def create_location(organization_id: str, payload: InventoryLocationCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("inventory.update")), db: Session = Depends(get_db)):
    return InventoryService(db).create_location(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/inventory/locations", response_model=InventoryLocationListResponse)
def list_locations(organization_id: str, _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return InventoryLocationListResponse(items=InventoryService(db).list_locations(organization_id))


@router.get("/inventory/locations/{location_id}", response_model=InventoryLocationResponse)
def get_location(organization_id: str, location_id: UUID, _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return InventoryService(db).get_location(organization_id, location_id)


@router.patch("/inventory/locations/{location_id}", response_model=InventoryLocationResponse)
def update_location(organization_id: str, location_id: UUID, payload: InventoryLocationUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("inventory.update")), db: Session = Depends(get_db)):
    return InventoryService(db).update_location(organization_id, location_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/inventory/balances", response_model=InventoryBalanceListResponse)
def list_balances(organization_id: str, item_id: UUID | None = None, location_id: UUID | None = None, positive_only: bool = Query(False), _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return InventoryBalanceListResponse(items=InventoryService(db).list_balances(organization_id, item_id=item_id, location_id=location_id, positive_only=positive_only))


@router.get("/inventory/items/{item_id}/balance", response_model=InventoryBalanceResponse)
def get_item_balance(organization_id: str, item_id: UUID, location_id: UUID | None = None, _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return InventoryService(db).get_balance_summary(organization_id, item_id, location_id=location_id)


@router.get("/inventory/items/{item_id}/movements", response_model=InventoryMovementListResponse)
def get_item_movements(organization_id: str, item_id: UUID, _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return InventoryMovementListResponse(items=InventoryService(db).list_movements(organization_id, item_id))


@router.get("/inventory/stock-on-hand", response_model=InventoryBalanceListResponse)
def stock_on_hand(organization_id: str, _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return InventoryBalanceListResponse(items=InventoryService(db).list_balances(organization_id, positive_only=True))


@router.get("/inventory/valuation", response_model=InventoryValuationSummaryResponse)
def valuation_summary(organization_id: str, _=Depends(require_permission("inventory.valuation.read")), db: Session = Depends(get_db)):
    return InventoryService(db).valuation_summary(organization_id)


@router.post("/inventory/adjustments", response_model=InventoryAdjustmentResponse)
def create_adjustment(organization_id: str, payload: InventoryAdjustmentCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("inventory.adjust")), db: Session = Depends(get_db)):
    return InventoryService(db).create_adjustment(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/inventory/adjustments", response_model=InventoryAdjustmentListResponse)
def list_adjustments(organization_id: str, _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return InventoryAdjustmentListResponse(items=InventoryService(db).list_adjustments(organization_id))


@router.get("/inventory/adjustments/{adjustment_id}", response_model=InventoryAdjustmentResponse)
def get_adjustment(organization_id: str, adjustment_id: UUID, _=Depends(require_permission("inventory.read")), db: Session = Depends(get_db)):
    return InventoryService(db).get_adjustment(organization_id, adjustment_id)
