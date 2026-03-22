from datetime import datetime, timezone

UTC = timezone.utc
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.core.enums import (
    AccountType,
    InventoryAdjustmentType,
    InventoryMovementType,
    InventorySourceEntityType,
    InventoryValuationMethod,
)
from app.core.exceptions import forbidden, not_found
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.inventory_repository import InventoryRepository
from app.repositories.orgs import OrganizationRepository
from app.repositories.period_repository import PeriodRepository
from app.services.journal_service import JournalService
from app.services.journal_validation_service import JournalValidationService


ZERO = Decimal("0")
PRECISION = Decimal("0.00000001")
NEGATIVE_INVENTORY_ALLOWED = False


class InventoryService:
    def __init__(self, db: Session):
        self.db = db
        self.inventory = InventoryRepository(db)
        self.accounts = AccountRepository(db)
        self.audit = AuditRepository(db)
        self.periods = PeriodRepository(db)
        self.organizations = OrganizationRepository(db)

    def _q(self, value: Decimal | int | str | None) -> Decimal:
        return Decimal(value or 0).quantize(PRECISION, rounding=ROUND_HALF_UP)

    def _organization_currency(self, organization_id) -> str:
        organization = self.organizations.get(organization_id)
        if not organization:
            raise not_found("Organization not found")
        return organization.base_currency

    def _require_open_period(self, organization_id, occurred_at: datetime):
        period = self.periods.resolve_by_date(organization_id, occurred_at.date())
        if not period:
            raise forbidden("No financial period for inventory date")
        JournalValidationService.validate_period_open(period)
        return period

    def _require_account(self, organization_id, account_id, *, allowed_types: set[AccountType] | None = None, message: str = "Invalid account"):
        account = self.accounts.get(organization_id, account_id)
        if not account or not account.is_active or not account.is_postable or account.deleted_at is not None:
            raise forbidden(message)
        if allowed_types and account.account_type not in allowed_types:
            raise forbidden(message)
        return account

    def _validate_item_payload(self, organization_id, payload, *, current_item=None):
        merged = {
            "name": current_item.name if current_item else None,
            "sku": current_item.sku if current_item else None,
            "is_sellable": current_item.is_sellable if current_item else True,
            "is_purchasable": current_item.is_purchasable if current_item else True,
            "is_tracked_inventory": current_item.is_tracked_inventory if current_item else False,
            "income_account_id": current_item.income_account_id if current_item else None,
            "expense_account_id": current_item.expense_account_id if current_item else None,
            "inventory_asset_account_id": current_item.inventory_asset_account_id if current_item else None,
        }
        merged.update(payload)
        if not merged.get("name"):
            raise forbidden("Item name is required")
        sku = merged.get("sku")
        if sku:
            existing = self.inventory.get_item_by_sku(organization_id, sku)
            if existing and (not current_item or existing.id != current_item.id):
                raise forbidden("Item SKU must be unique within the organization")
        if not merged["is_sellable"] and not merged["is_purchasable"]:
            raise forbidden("Item must be sellable, purchasable, or both")
        if merged["is_sellable"] and not merged.get("income_account_id"):
            raise forbidden("Sellable items require an income account")
        if merged["is_purchasable"] and not merged.get("expense_account_id"):
            raise forbidden("Purchasable items require an expense account")
        if merged["is_tracked_inventory"] and not merged.get("inventory_asset_account_id"):
            raise forbidden("Tracked inventory items require an inventory asset account")
        for field_name in ["income_account_id", "expense_account_id", "inventory_asset_account_id"]:
            account_id = merged.get(field_name)
            if not account_id:
                continue
            allowed = None
            if field_name == "income_account_id":
                allowed = {AccountType.REVENUE}
            elif field_name == "expense_account_id":
                allowed = {AccountType.EXPENSE}
            elif field_name == "inventory_asset_account_id":
                allowed = {AccountType.ASSET}
            self._require_account(organization_id, account_id, allowed_types=allowed, message=f"Invalid {field_name}")
        return merged

    def create_item(self, organization_id, actor_user_id, payload):
        normalized = self._validate_item_payload(organization_id, payload)
        item = self.inventory.create_item(organization_id=organization_id, **normalized)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="item.created", entity_type="item", entity_id=str(item.id))
        self.db.commit()
        return item

    def update_item(self, organization_id, item_id, actor_user_id, payload):
        item = self.inventory.get_item(organization_id, item_id)
        if not item:
            raise not_found("Item not found")
        normalized = self._validate_item_payload(organization_id, payload, current_item=item)
        for key, value in normalized.items():
            setattr(item, key, value)
        if payload.get("is_active") is not None:
            item.is_active = payload["is_active"]
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="item.updated", entity_type="item", entity_id=str(item.id))
        self.db.commit()
        return item

    def archive_item(self, organization_id, item_id, actor_user_id):
        item = self.inventory.get_item(organization_id, item_id)
        if not item:
            raise not_found("Item not found")
        balance = self.inventory.get_balance(organization_id, item.id)
        if self._q(balance.quantity_on_hand) != ZERO:
            raise forbidden("Cannot archive an item with stock on hand")
        item.is_active = False
        item.archived_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="item.archived", entity_type="item", entity_id=str(item.id))
        self.db.commit()

    def list_items(self, organization_id, search: str | None = None, active_only: bool | None = None):
        return self.inventory.list_items(organization_id, search=search, active_only=active_only)

    def get_item(self, organization_id, item_id):
        item = self.inventory.get_item(organization_id, item_id)
        if not item:
            raise not_found("Item not found")
        return item

    def create_location(self, organization_id, actor_user_id, payload):
        location = self.inventory.create_location(organization_id=organization_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="inventory_location.created", entity_type="inventory_location", entity_id=str(location.id))
        self.db.commit()
        return location

    def update_location(self, organization_id, location_id, actor_user_id, payload):
        location = self.inventory.get_location(organization_id, location_id)
        if not location:
            raise not_found("Inventory location not found")
        for key, value in payload.items():
            setattr(location, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="inventory_location.updated", entity_type="inventory_location", entity_id=str(location.id))
        self.db.commit()
        return location

    def list_locations(self, organization_id):
        return self.inventory.list_locations(organization_id)

    def get_location(self, organization_id, location_id):
        location = self.inventory.get_location(organization_id, location_id)
        if not location:
            raise not_found("Inventory location not found")
        return location

    def _apply_balance_delta(self, balance, quantity_delta: Decimal, total_cost_delta: Decimal, explicit_new_average: Decimal | None = None):
        new_quantity = self._q(balance.quantity_on_hand) + self._q(quantity_delta)
        new_value = self._q(balance.inventory_value) + self._q(total_cost_delta)
        if not NEGATIVE_INVENTORY_ALLOWED and new_quantity < ZERO:
            raise forbidden("Negative inventory is not allowed")
        if new_quantity == ZERO:
            new_average = ZERO
            new_value = ZERO
        elif explicit_new_average is not None:
            new_average = self._q(explicit_new_average)
            new_value = self._q(new_average * new_quantity)
        else:
            new_average = self._q(new_value / new_quantity)
        balance.quantity_on_hand = self._q(new_quantity)
        balance.inventory_value = self._q(new_value)
        balance.average_unit_cost = self._q(new_average)
        balance.available_quantity = self._q(balance.quantity_on_hand - self._q(balance.reserved_quantity))
        balance.updated_at = datetime.now(UTC)
        return balance

    def _movement_type_for_adjustment(self, adjustment_type: InventoryAdjustmentType, quantity: Decimal):
        if adjustment_type == InventoryAdjustmentType.OPENING_STOCK:
            return InventoryMovementType.OPENING
        if quantity > ZERO:
            return InventoryMovementType.ADJUSTMENT_IN
        return InventoryMovementType.ADJUSTMENT_OUT

    def record_movement(
        self,
        organization_id,
        actor_user_id,
        *,
        item,
        location_id,
        movement_type,
        source_entity_type,
        source_entity_id,
        quantity,
        unit_cost,
        occurred_at,
        notes=None,
        reversal_of_movement_id=None,
        accounting_journal_id=None,
    ):
        self._require_open_period(organization_id, occurred_at)
        if location_id is not None:
            self.get_location(organization_id, location_id)
        balance = self.inventory.get_balance(organization_id, item.id, location_id)
        quantity = self._q(quantity)
        unit_cost = self._q(unit_cost)
        if movement_type in {InventoryMovementType.SALE, InventoryMovementType.ADJUSTMENT_OUT, InventoryMovementType.TRANSFER_OUT} and quantity > ZERO:
            quantity = -quantity
        if movement_type == InventoryMovementType.REVERSAL and reversal_of_movement_id is None:
            raise forbidden("Reversal movements must reference an original movement")
        if quantity < ZERO and unit_cost == ZERO:
            unit_cost = self._q(balance.average_unit_cost)
        total_cost = self._q(abs(quantity) * unit_cost)
        if quantity < ZERO:
            total_cost = -total_cost
        new_average = None
        if quantity > ZERO and movement_type in {InventoryMovementType.PURCHASE, InventoryMovementType.OPENING, InventoryMovementType.ADJUSTMENT_IN, InventoryMovementType.REVERSAL, InventoryMovementType.TRANSFER_IN}:
            resulting_qty = self._q(balance.quantity_on_hand) + quantity
            resulting_value = self._q(balance.inventory_value) + total_cost
            new_average = ZERO if resulting_qty == ZERO else self._q(resulting_value / resulting_qty)
        self._apply_balance_delta(balance, quantity, total_cost, explicit_new_average=new_average)
        movement = self.inventory.create_movement(
            organization_id=organization_id,
            item_id=item.id,
            location_id=location_id,
            movement_type=movement_type,
            source_entity_type=source_entity_type,
            source_entity_id=str(source_entity_id) if source_entity_id is not None else None,
            quantity=quantity,
            unit_cost=unit_cost,
            total_cost=total_cost,
            quantity_balance_after=balance.quantity_on_hand,
            inventory_value_after=balance.inventory_value,
            average_unit_cost_after=balance.average_unit_cost,
            occurred_at=occurred_at,
            posted_at=datetime.now(UTC),
            notes=notes,
            created_by_user_id=actor_user_id,
            reversal_of_movement_id=reversal_of_movement_id,
            accounting_journal_id=accounting_journal_id,
        )
        return movement

    def create_adjustment(self, organization_id, actor_user_id, payload):
        item = self.get_item(organization_id, payload["item_id"])
        if not item.is_tracked_inventory:
            raise forbidden("Only tracked inventory items can be adjusted")
        if not item.inventory_asset_account_id:
            raise forbidden("Tracked inventory item is missing an inventory asset account")
        quantity = self._q(payload["quantity"])
        if quantity == ZERO:
            raise forbidden("Inventory adjustment quantity cannot be zero")
        occurred_at = payload["occurred_at"]
        offset_account = self._require_account(organization_id, payload["offset_account_id"], message="Invalid inventory adjustment offset account")
        if quantity > ZERO:
            unit_cost = self._q(payload.get("unit_cost") or item.purchase_price or ZERO)
            if unit_cost <= ZERO:
                raise forbidden("Positive inventory adjustments require a unit cost")
        else:
            unit_cost = self._q(payload.get("unit_cost") or self.inventory.get_balance(organization_id, item.id, payload.get("location_id")).average_unit_cost)
            if unit_cost < ZERO:
                raise forbidden("Inventory adjustment cost cannot be negative")
        movement = self.record_movement(
            organization_id,
            actor_user_id,
            item=item,
            location_id=payload.get("location_id"),
            movement_type=self._movement_type_for_adjustment(payload["adjustment_type"], quantity),
            source_entity_type=InventorySourceEntityType.ADJUSTMENT,
            source_entity_id=None,
            quantity=quantity,
            unit_cost=unit_cost,
            occurred_at=occurred_at,
            notes=payload.get("notes") or payload["reason"],
        )
        total_cost_abs = self._q(abs(movement.total_cost))
        journal_lines = []
        if quantity > ZERO:
            journal_lines = [
                {"account_id": item.inventory_asset_account_id, "description": f"Inventory adjustment {item.name}", "debit_amount": total_cost_abs, "credit_amount": ZERO},
                {"account_id": offset_account.id, "description": payload["reason"], "debit_amount": ZERO, "credit_amount": total_cost_abs},
            ]
        else:
            journal_lines = [
                {"account_id": offset_account.id, "description": payload["reason"], "debit_amount": total_cost_abs, "credit_amount": ZERO},
                {"account_id": item.inventory_asset_account_id, "description": f"Inventory adjustment {item.name}", "debit_amount": ZERO, "credit_amount": total_cost_abs},
            ]
        journal = JournalService(self.db).create_and_post(
            organization_id,
            actor_user_id,
            {
                "entry_date": occurred_at.date(),
                "description": f"Inventory adjustment for {item.name}",
                "reference": payload["reason"],
                "source_module": "inventory",
                "source_type": "adjustment",
                "source_id": "pending",
                "lines": [type("L", (), line | {"currency_code": self._organization_currency(organization_id), "exchange_rate": None}) for line in journal_lines],
            },
        )
        movement.accounting_journal_id = journal.id
        adjustment = self.inventory.create_adjustment(
            organization_id=organization_id,
            item_id=item.id,
            location_id=payload.get("location_id"),
            adjustment_type=payload["adjustment_type"],
            quantity=quantity,
            unit_cost=unit_cost,
            total_cost=movement.total_cost,
            reason=payload["reason"],
            notes=payload.get("notes"),
            offset_account_id=offset_account.id,
            occurred_at=occurred_at,
            created_by_user_id=actor_user_id,
            movement_id=movement.id,
            posted_journal_id=journal.id,
        )
        movement.source_entity_id = str(adjustment.id)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="inventory.adjusted", entity_type="inventory_adjustment", entity_id=str(adjustment.id))
        self.db.commit()
        return adjustment

    def _resolve_line_item(self, organization_id, line):
        item_id = getattr(line, "item_id", None) or (line.get("item_id") if isinstance(line, dict) else None)
        if not item_id:
            return None
        item = self.inventory.get_item(organization_id, item_id)
        if not item:
            raise forbidden("Referenced inventory item was not found")
        if not item.is_active or item.archived_at is not None:
            raise forbidden("Referenced inventory item is inactive")
        return item

    def list_document_movement_hooks(self, organization_id, source_entity_type, source_entity_id, lines):
        hooks = []
        for line in lines:
            item = self._resolve_line_item(organization_id, line)
            if not item or not item.is_tracked_inventory:
                continue
            quantity = self._q(getattr(line, "quantity", None) or line["quantity"])
            balance = self.inventory.get_balance(organization_id, item.id, getattr(line, "location_id", None) or line.get("location_id") if isinstance(line, dict) else None)
            unit_cost = self._q(balance.average_unit_cost)
            hooks.append({
                "item": item,
                "line": line,
                "quantity": quantity,
                "unit_cost": unit_cost,
                "total_cost": self._q(quantity * unit_cost),
                "source_entity_type": source_entity_type,
                "source_entity_id": source_entity_id,
            })
        return hooks

    def post_bill_movements(self, organization_id, bill, lines, actor_user_id):
        created = []
        for line in lines:
            item = self._resolve_line_item(organization_id, line)
            if not item or not item.is_tracked_inventory:
                continue
            quantity = self._q(line.quantity)
            if quantity <= ZERO:
                raise forbidden("Tracked inventory bill lines require a positive quantity")
            unit_cost = self._q((Decimal(line.line_taxable_amount or line.line_subtotal) / quantity) if quantity else ZERO)
            if unit_cost < ZERO:
                raise forbidden("Tracked inventory bill lines require a non-negative unit cost")
            created.append(
                self.record_movement(
                    organization_id,
                    actor_user_id,
                    item=item,
                    location_id=line.location_id,
                    movement_type=InventoryMovementType.PURCHASE,
                    source_entity_type=InventorySourceEntityType.BILL,
                    source_entity_id=bill.id,
                    quantity=quantity,
                    unit_cost=unit_cost,
                    occurred_at=datetime.combine(bill.issue_date, datetime.min.time(), tzinfo=UTC),
                    notes=f"Bill {bill.bill_number}",
                )
            )
        return created

    def post_invoice_movements(self, organization_id, invoice, lines, actor_user_id):
        created = []
        hooks = []
        for line in lines:
            item = self._resolve_line_item(organization_id, line)
            if not item or not item.is_tracked_inventory:
                continue
            quantity = self._q(line.quantity)
            balance = self.inventory.get_balance(organization_id, item.id, line.location_id)
            unit_cost = self._q(balance.average_unit_cost)
            if unit_cost < ZERO:
                raise forbidden("Tracked inventory item has an invalid average cost")
            movement = self.record_movement(
                organization_id,
                actor_user_id,
                item=item,
                location_id=line.location_id,
                movement_type=InventoryMovementType.SALE,
                source_entity_type=InventorySourceEntityType.INVOICE,
                source_entity_id=invoice.id,
                quantity=quantity,
                unit_cost=unit_cost,
                occurred_at=datetime.combine(invoice.issue_date, datetime.min.time(), tzinfo=UTC),
                notes=f"Invoice {invoice.invoice_number}",
            )
            created.append(movement)
            hooks.append({"item": item, "movement": movement, "line": line})
        return created, hooks

    def reverse_document_movements(self, organization_id, source_entity_type, source_entity_id, actor_user_id, occurred_at: datetime, notes: str):
        originals = [
            movement
            for movement in self.inventory.list_movements(organization_id, source_entity_type=source_entity_type, source_entity_id=source_entity_id)
            if movement.reversal_of_movement_id is None
        ]
        reversals = []
        for original in originals:
            item = self.get_item(organization_id, original.item_id)
            reversal_quantity = -self._q(original.quantity)
            reversals.append(
                self.record_movement(
                    organization_id,
                    actor_user_id,
                    item=item,
                    location_id=original.location_id,
                    movement_type=InventoryMovementType.REVERSAL,
                    source_entity_type=source_entity_type,
                    source_entity_id=source_entity_id,
                    quantity=reversal_quantity,
                    unit_cost=self._q(original.unit_cost),
                    occurred_at=occurred_at,
                    notes=notes,
                    reversal_of_movement_id=original.id,
                )
            )
        return reversals

    def list_balances(self, organization_id, item_id=None, location_id=None, positive_only=False):
        balances = self.inventory.list_balances(organization_id, item_id=item_id, location_id=location_id, positive_only=positive_only)
        items = {item.id: item for item in self.inventory.list_items(organization_id)}
        locations = {location.id: location for location in self.inventory.list_locations(organization_id)}
        response = []
        for balance in balances:
            item = items.get(balance.item_id)
            location = locations.get(balance.location_id) if balance.location_id else None
            response.append(
                {
                    "item_id": balance.item_id,
                    "item_name": item.name if item else "Unknown item",
                    "sku": item.sku if item else None,
                    "location_id": balance.location_id,
                    "location_name": location.name if location else None,
                    "quantity_on_hand": self._q(balance.quantity_on_hand),
                    "reserved_quantity": self._q(balance.reserved_quantity),
                    "available_quantity": self._q(balance.available_quantity),
                    "average_unit_cost": self._q(balance.average_unit_cost),
                    "inventory_value": self._q(balance.inventory_value),
                    "updated_at": balance.updated_at,
                }
            )
        return response

    def get_balance_summary(self, organization_id, item_id, location_id=None):
        self.get_item(organization_id, item_id)
        rows = self.list_balances(organization_id, item_id=item_id, location_id=location_id)
        if rows:
            return rows[0]
        item = self.get_item(organization_id, item_id)
        location = self.get_location(organization_id, location_id) if location_id else None
        return {
            "item_id": item.id,
            "item_name": item.name,
            "sku": item.sku,
            "location_id": location.id if location else None,
            "location_name": location.name if location else None,
            "quantity_on_hand": ZERO,
            "reserved_quantity": ZERO,
            "available_quantity": ZERO,
            "average_unit_cost": ZERO,
            "inventory_value": ZERO,
            "updated_at": datetime.now(UTC),
        }

    def list_movements(self, organization_id, item_id):
        self.get_item(organization_id, item_id)
        return self.inventory.list_movements(organization_id, item_id=item_id)

    def list_adjustments(self, organization_id):
        return self.inventory.list_adjustments(organization_id)

    def get_adjustment(self, organization_id, adjustment_id):
        adjustment = self.inventory.get_adjustment(organization_id, adjustment_id)
        if not adjustment:
            raise not_found("Inventory adjustment not found")
        return adjustment

    def valuation_summary(self, organization_id):
        items = self.list_balances(organization_id, positive_only=True)
        total_quantity = sum((self._q(item["quantity_on_hand"]) for item in items), ZERO)
        total_value = sum((self._q(item["inventory_value"]) for item in items), ZERO)
        return {
            "valuation_method": InventoryValuationMethod.WEIGHTED_AVERAGE,
            "total_quantity_on_hand": self._q(total_quantity),
            "total_inventory_value": self._q(total_value),
            "items": items,
        }
