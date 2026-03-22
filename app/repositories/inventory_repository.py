from datetime import datetime, timezone

UTC = timezone.utc

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import InventoryAdjustment, InventoryBalance, InventoryLocation, InventoryMovement, Item


class InventoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_item(self, **kwargs) -> Item:
        item = Item(**kwargs)
        self.db.add(item)
        self.db.flush()
        return item

    def get_item(self, organization_id, item_id):
        return self.db.scalar(
            select(Item).where(Item.organization_id == organization_id, Item.id == item_id, Item.deleted_at.is_(None))
        )

    def get_item_by_sku(self, organization_id, sku: str):
        return self.db.scalar(
            select(Item).where(Item.organization_id == organization_id, Item.sku == sku, Item.deleted_at.is_(None))
        )

    def list_items(self, organization_id, search: str | None = None, active_only: bool | None = None):
        query = select(Item).where(Item.organization_id == organization_id, Item.deleted_at.is_(None))
        if search:
            term = f"%{search}%"
            query = query.where(or_(Item.sku.ilike(term), Item.name.ilike(term), Item.description.ilike(term)))
        if active_only is True:
            query = query.where(Item.is_active.is_(True), Item.archived_at.is_(None))
        if active_only is False:
            query = query.where(or_(Item.is_active.is_(False), Item.archived_at.is_not(None)))
        return list(self.db.scalars(query.order_by(Item.name)).all())

    def create_location(self, **kwargs) -> InventoryLocation:
        location = InventoryLocation(**kwargs)
        self.db.add(location)
        self.db.flush()
        return location

    def get_location(self, organization_id, location_id):
        return self.db.scalar(
            select(InventoryLocation).where(
                InventoryLocation.organization_id == organization_id,
                InventoryLocation.id == location_id,
                InventoryLocation.deleted_at.is_(None),
            )
        )

    def list_locations(self, organization_id):
        return list(
            self.db.scalars(
                select(InventoryLocation)
                .where(InventoryLocation.organization_id == organization_id, InventoryLocation.deleted_at.is_(None))
                .order_by(InventoryLocation.code)
            ).all()
        )

    def get_balance(self, organization_id, item_id, location_id=None):
        balance = self.db.scalar(
            select(InventoryBalance).where(
                InventoryBalance.organization_id == organization_id,
                InventoryBalance.item_id == item_id,
                InventoryBalance.location_id == location_id,
            )
        )
        if balance:
            return balance
        balance = InventoryBalance(
            organization_id=organization_id,
            item_id=item_id,
            location_id=location_id,
            quantity_on_hand=0,
            reserved_quantity=0,
            available_quantity=0,
            average_unit_cost=0,
            inventory_value=0,
            updated_at=datetime.now(UTC),
        )
        self.db.add(balance)
        self.db.flush()
        return balance

    def list_balances(self, organization_id, item_id=None, location_id=None, positive_only=False):
        query = select(InventoryBalance).where(InventoryBalance.organization_id == organization_id)
        if item_id:
            query = query.where(InventoryBalance.item_id == item_id)
        if location_id is not None:
            query = query.where(InventoryBalance.location_id == location_id)
        if positive_only:
            query = query.where(InventoryBalance.quantity_on_hand != 0)
        return list(self.db.scalars(query.order_by(InventoryBalance.updated_at.desc())).all())

    def create_movement(self, **kwargs) -> InventoryMovement:
        movement = InventoryMovement(**kwargs)
        self.db.add(movement)
        self.db.flush()
        return movement

    def list_movements(self, organization_id, item_id=None, source_entity_type=None, source_entity_id=None):
        query = select(InventoryMovement).where(
            InventoryMovement.organization_id == organization_id,
            InventoryMovement.deleted_at.is_(None),
        )
        if item_id:
            query = query.where(InventoryMovement.item_id == item_id)
        if source_entity_type:
            query = query.where(InventoryMovement.source_entity_type == source_entity_type)
        if source_entity_id:
            query = query.where(InventoryMovement.source_entity_id == str(source_entity_id))
        return list(
            self.db.scalars(
                query.order_by(InventoryMovement.occurred_at, InventoryMovement.created_at, InventoryMovement.id)
            ).all()
        )

    def create_adjustment(self, **kwargs) -> InventoryAdjustment:
        adjustment = InventoryAdjustment(**kwargs)
        self.db.add(adjustment)
        self.db.flush()
        return adjustment

    def get_adjustment(self, organization_id, adjustment_id):
        return self.db.scalar(
            select(InventoryAdjustment).where(
                InventoryAdjustment.organization_id == organization_id,
                InventoryAdjustment.id == adjustment_id,
                InventoryAdjustment.deleted_at.is_(None),
            )
        )

    def list_adjustments(self, organization_id):
        return list(
            self.db.scalars(
                select(InventoryAdjustment)
                .where(InventoryAdjustment.organization_id == organization_id, InventoryAdjustment.deleted_at.is_(None))
                .order_by(InventoryAdjustment.occurred_at.desc(), InventoryAdjustment.created_at.desc())
            ).all()
        )

    def item_has_movements(self, organization_id, item_id) -> bool:
        return self.db.scalar(
            select(func.count(InventoryMovement.id)).where(
                InventoryMovement.organization_id == organization_id,
                InventoryMovement.item_id == item_id,
                InventoryMovement.deleted_at.is_(None),
            )
        ) > 0
