from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import (
    InventoryAdjustmentType,
    InventoryCostingMethod,
    InventoryMovementType,
    InventorySourceEntityType,
    InventoryValuationMethod,
)
from app.schemas.common import ORMModel


class ItemCreateRequest(BaseModel):
    sku: str | None = None
    name: str
    description: str | None = None
    is_sellable: bool = True
    is_purchasable: bool = True
    is_tracked_inventory: bool = False
    unit_of_measure: str | None = None
    sales_price: Decimal | None = Field(default=None, ge=0)
    purchase_price: Decimal | None = Field(default=None, ge=0)
    income_account_id: UUID | None = None
    expense_account_id: UUID | None = None
    inventory_asset_account_id: UUID | None = None
    sales_tax_code_id: UUID | None = None
    purchase_tax_code_id: UUID | None = None
    costing_method: InventoryCostingMethod = InventoryCostingMethod.WEIGHTED_AVERAGE
    valuation_method: InventoryValuationMethod = InventoryValuationMethod.WEIGHTED_AVERAGE


class ItemUpdateRequest(BaseModel):
    sku: str | None = None
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    is_sellable: bool | None = None
    is_purchasable: bool | None = None
    is_tracked_inventory: bool | None = None
    unit_of_measure: str | None = None
    sales_price: Decimal | None = Field(default=None, ge=0)
    purchase_price: Decimal | None = Field(default=None, ge=0)
    income_account_id: UUID | None = None
    expense_account_id: UUID | None = None
    inventory_asset_account_id: UUID | None = None
    sales_tax_code_id: UUID | None = None
    purchase_tax_code_id: UUID | None = None


class ItemResponse(ORMModel):
    id: UUID
    organization_id: UUID
    sku: str | None
    name: str
    description: str | None
    is_active: bool
    is_sellable: bool
    is_purchasable: bool
    is_tracked_inventory: bool
    unit_of_measure: str | None
    sales_price: Decimal | None
    purchase_price: Decimal | None
    income_account_id: UUID | None
    expense_account_id: UUID | None
    inventory_asset_account_id: UUID | None
    sales_tax_code_id: UUID | None
    purchase_tax_code_id: UUID | None
    costing_method: InventoryCostingMethod
    valuation_method: InventoryValuationMethod
    archived_at: datetime | None


class ItemListResponse(BaseModel):
    items: list[ItemResponse]


class InventoryLocationCreateRequest(BaseModel):
    code: str
    name: str
    description: str | None = None


class InventoryLocationUpdateRequest(BaseModel):
    code: str | None = None
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class InventoryLocationResponse(ORMModel):
    id: UUID
    organization_id: UUID
    code: str
    name: str
    description: str | None
    is_active: bool
    archived_at: datetime | None


class InventoryLocationListResponse(BaseModel):
    items: list[InventoryLocationResponse]


class InventoryBalanceResponse(BaseModel):
    item_id: UUID
    item_name: str
    sku: str | None = None
    location_id: UUID | None = None
    location_name: str | None = None
    quantity_on_hand: Decimal
    reserved_quantity: Decimal
    available_quantity: Decimal
    average_unit_cost: Decimal
    inventory_value: Decimal
    updated_at: datetime


class InventoryBalanceListResponse(BaseModel):
    items: list[InventoryBalanceResponse]


class InventoryMovementResponse(ORMModel):
    id: UUID
    organization_id: UUID
    item_id: UUID
    location_id: UUID | None
    movement_type: InventoryMovementType
    source_entity_type: InventorySourceEntityType
    source_entity_id: str | None
    quantity: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    quantity_balance_after: Decimal
    inventory_value_after: Decimal
    average_unit_cost_after: Decimal
    occurred_at: datetime
    posted_at: datetime
    notes: str | None
    reversal_of_movement_id: UUID | None
    accounting_journal_id: UUID | None


class InventoryMovementListResponse(BaseModel):
    items: list[InventoryMovementResponse]


class InventoryAdjustmentCreateRequest(BaseModel):
    item_id: UUID
    location_id: UUID | None = None
    adjustment_type: InventoryAdjustmentType
    quantity: Decimal
    unit_cost: Decimal | None = Field(default=None, ge=0)
    reason: str
    notes: str | None = None
    offset_account_id: UUID
    occurred_at: datetime


class InventoryAdjustmentResponse(ORMModel):
    id: UUID
    organization_id: UUID
    item_id: UUID
    location_id: UUID | None
    adjustment_type: InventoryAdjustmentType
    quantity: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    reason: str
    notes: str | None
    offset_account_id: UUID
    occurred_at: datetime
    movement_id: UUID | None
    posted_journal_id: UUID | None
    reversal_adjustment_id: UUID | None


class InventoryAdjustmentListResponse(BaseModel):
    items: list[InventoryAdjustmentResponse]


class InventoryValuationSummaryResponse(BaseModel):
    valuation_method: InventoryValuationMethod
    total_quantity_on_hand: Decimal
    total_inventory_value: Decimal
    items: list[InventoryBalanceResponse]
