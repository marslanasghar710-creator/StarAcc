import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import (
    InventoryAdjustmentType,
    InventoryCostingMethod,
    InventoryMovementType,
    InventorySourceEntityType,
    InventoryValuationMethod,
)
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class Item(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "items"
    __table_args__ = (
        UniqueConstraint("organization_id", "sku", name="uq_item_org_sku"),
        CheckConstraint("sales_price >= 0", name="ck_item_sales_price_non_negative"),
        CheckConstraint("purchase_price >= 0", name="ck_item_purchase_price_non_negative"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    is_sellable: Mapped[bool] = mapped_column(nullable=False, default=True)
    is_purchasable: Mapped[bool] = mapped_column(nullable=False, default=True)
    is_tracked_inventory: Mapped[bool] = mapped_column(nullable=False, default=False)
    unit_of_measure: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sales_price: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    income_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    expense_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    inventory_asset_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    sales_tax_code_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tax_codes.id"), nullable=True)
    purchase_tax_code_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tax_codes.id"), nullable=True)
    costing_method: Mapped[InventoryCostingMethod] = mapped_column(
        Enum(InventoryCostingMethod, name="inventory_costing_method", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False, default=InventoryCostingMethod.WEIGHTED_AVERAGE
    )
    valuation_method: Mapped[InventoryValuationMethod] = mapped_column(
        Enum(InventoryValuationMethod, name="inventory_valuation_method", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False, default=InventoryValuationMethod.WEIGHTED_AVERAGE
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class InventoryLocation(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "inventory_locations"
    __table_args__ = (UniqueConstraint("organization_id", "code", name="uq_inventory_location_org_code"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class InventoryBalance(Base, UUIDPKMixin):
    __tablename__ = "inventory_balances"
    __table_args__ = (UniqueConstraint("organization_id", "item_id", "location_id", name="uq_inventory_balance_scope"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False, index=True)
    location_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_locations.id"), nullable=True, index=True)
    quantity_on_hand: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    reserved_quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    available_quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    average_unit_cost: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    inventory_value: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class InventoryMovement(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "inventory_movements"
    __table_args__ = (
        CheckConstraint("quantity != 0", name="ck_inventory_movement_quantity_non_zero"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False, index=True)
    location_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_locations.id"), nullable=True, index=True)
    movement_type: Mapped[InventoryMovementType] = mapped_column(Enum(InventoryMovementType, name="inventory_movement_type", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False)
    source_entity_type: Mapped[InventorySourceEntityType] = mapped_column(
        Enum(InventorySourceEntityType, name="inventory_source_entity_type", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False
    )
    source_entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    total_cost: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    quantity_balance_after: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    inventory_value_after: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    average_unit_cost_after: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reversal_of_movement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_movements.id"), nullable=True, index=True)
    accounting_journal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"), nullable=True)


class InventoryAdjustment(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "inventory_adjustments"
    __table_args__ = (
        CheckConstraint("quantity != 0", name="ck_inventory_adjustment_quantity_non_zero"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False, index=True)
    location_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_locations.id"), nullable=True, index=True)
    adjustment_type: Mapped[InventoryAdjustmentType] = mapped_column(
        Enum(InventoryAdjustmentType, name="inventory_adjustment_type", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    total_cost: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    offset_account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    movement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_movements.id"), nullable=True)
    posted_journal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"), nullable=True)
    reversal_adjustment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_adjustments.id"), nullable=True)
