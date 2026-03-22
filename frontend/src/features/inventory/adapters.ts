import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type {
  InventoryAdjustment,
  InventoryBalance,
  InventoryItem,
  InventoryLocation,
  InventoryMovement,
  InventoryValuationSummary,
  RawInventoryAdjustment,
  RawInventoryBalance,
  RawInventoryItem,
  RawInventoryLocation,
  RawInventoryMovement,
  RawInventoryValuation,
} from "@/features/inventory/types";

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function booleanOrDefault(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function decimalOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return sanitizeDecimalInput(typeof value === "string" || typeof value === "number" ? value : 0);
}

export function adaptInventoryItem(raw: RawInventoryItem): InventoryItem {
  return {
    id: String(raw.id ?? ""),
    organizationId: stringOrNull(raw.organization_id ?? raw.organizationId),
    sku: stringOrNull(raw.sku),
    name: typeof raw.name === "string" ? raw.name : "Inventory item",
    description: stringOrNull(raw.description),
    isActive: booleanOrDefault(raw.is_active ?? raw.isActive, true),
    isSellable: booleanOrDefault(raw.is_sellable ?? raw.isSellable, true),
    isPurchasable: booleanOrDefault(raw.is_purchasable ?? raw.isPurchasable, true),
    isTrackedInventory: booleanOrDefault(raw.is_tracked_inventory ?? raw.isTrackedInventory, false),
    unitOfMeasure: stringOrNull(raw.unit_of_measure ?? raw.unitOfMeasure),
    salesPrice: decimalOrNull(raw.sales_price ?? raw.salesPrice),
    purchasePrice: decimalOrNull(raw.purchase_price ?? raw.purchasePrice),
    incomeAccountId: stringOrNull(raw.income_account_id ?? raw.incomeAccountId),
    expenseAccountId: stringOrNull(raw.expense_account_id ?? raw.expenseAccountId),
    inventoryAssetAccountId: stringOrNull(raw.inventory_asset_account_id ?? raw.inventoryAssetAccountId),
    salesTaxCodeId: stringOrNull(raw.sales_tax_code_id ?? raw.salesTaxCodeId),
    purchaseTaxCodeId: stringOrNull(raw.purchase_tax_code_id ?? raw.purchaseTaxCodeId),
    costingMethod: stringOrNull(raw.costing_method ?? raw.costingMethod),
    valuationMethod: stringOrNull(raw.valuation_method ?? raw.valuationMethod),
    archivedAt: stringOrNull(raw.archived_at ?? raw.archivedAt),
    createdAt: stringOrNull(raw.created_at ?? raw.createdAt),
    updatedAt: stringOrNull(raw.updated_at ?? raw.updatedAt),
  };
}

export function adaptInventoryBalance(raw: RawInventoryBalance): InventoryBalance {
  return {
    itemId: String(raw.item_id ?? raw.itemId ?? ""),
    itemName: typeof raw.item_name === "string" ? raw.item_name : typeof raw.itemName === "string" ? raw.itemName : "Inventory item",
    sku: stringOrNull(raw.sku),
    locationId: stringOrNull(raw.location_id ?? raw.locationId),
    locationName: stringOrNull(raw.location_name ?? raw.locationName),
    quantityOnHand: sanitizeDecimalInput((raw.quantity_on_hand ?? raw.quantityOnHand ?? 0) as string | number | null | undefined),
    reservedQuantity: sanitizeDecimalInput((raw.reserved_quantity ?? raw.reservedQuantity ?? 0) as string | number | null | undefined),
    availableQuantity: sanitizeDecimalInput((raw.available_quantity ?? raw.availableQuantity ?? 0) as string | number | null | undefined),
    averageUnitCost: sanitizeDecimalInput((raw.average_unit_cost ?? raw.averageUnitCost ?? 0) as string | number | null | undefined),
    inventoryValue: sanitizeDecimalInput((raw.inventory_value ?? raw.inventoryValue ?? 0) as string | number | null | undefined),
    updatedAt: stringOrNull(raw.updated_at ?? raw.updatedAt),
  };
}

export function adaptInventoryMovement(raw: RawInventoryMovement): InventoryMovement {
  return {
    id: String(raw.id ?? ""),
    organizationId: stringOrNull(raw.organization_id ?? raw.organizationId),
    itemId: String(raw.item_id ?? raw.itemId ?? ""),
    locationId: stringOrNull(raw.location_id ?? raw.locationId),
    movementType: String(raw.movement_type ?? raw.movementType ?? "adjustment_in") as InventoryMovement["movementType"],
    sourceEntityType: String(raw.source_entity_type ?? raw.sourceEntityType ?? "manual"),
    sourceEntityId: stringOrNull(raw.source_entity_id ?? raw.sourceEntityId),
    quantity: sanitizeDecimalInput((raw.quantity ?? 0) as string | number | null | undefined),
    unitCost: sanitizeDecimalInput((raw.unit_cost ?? raw.unitCost ?? 0) as string | number | null | undefined),
    totalCost: sanitizeDecimalInput((raw.total_cost ?? raw.totalCost ?? 0) as string | number | null | undefined),
    quantityBalanceAfter: decimalOrNull(raw.quantity_balance_after ?? raw.quantityBalanceAfter),
    inventoryValueAfter: decimalOrNull(raw.inventory_value_after ?? raw.inventoryValueAfter),
    averageUnitCostAfter: decimalOrNull(raw.average_unit_cost_after ?? raw.averageUnitCostAfter),
    occurredAt: stringOrNull(raw.occurred_at ?? raw.occurredAt),
    postedAt: stringOrNull(raw.posted_at ?? raw.postedAt),
    notes: stringOrNull(raw.notes),
    reversalOfMovementId: stringOrNull(raw.reversal_of_movement_id ?? raw.reversalOfMovementId),
    accountingJournalId: stringOrNull(raw.accounting_journal_id ?? raw.accountingJournalId),
  };
}

export function adaptInventoryAdjustment(raw: RawInventoryAdjustment): InventoryAdjustment {
  return {
    id: String(raw.id ?? ""),
    organizationId: stringOrNull(raw.organization_id ?? raw.organizationId),
    itemId: String(raw.item_id ?? raw.itemId ?? ""),
    locationId: stringOrNull(raw.location_id ?? raw.locationId),
    adjustmentType: String(raw.adjustment_type ?? raw.adjustmentType ?? "quantity_write_up") as InventoryAdjustment["adjustmentType"],
    quantity: sanitizeDecimalInput((raw.quantity ?? 0) as string | number | null | undefined),
    unitCost: sanitizeDecimalInput((raw.unit_cost ?? raw.unitCost ?? 0) as string | number | null | undefined),
    totalCost: sanitizeDecimalInput((raw.total_cost ?? raw.totalCost ?? 0) as string | number | null | undefined),
    reason: typeof raw.reason === "string" ? raw.reason : "Adjustment",
    notes: stringOrNull(raw.notes),
    offsetAccountId: String(raw.offset_account_id ?? raw.offsetAccountId ?? ""),
    occurredAt: String(raw.occurred_at ?? raw.occurredAt ?? new Date().toISOString()),
    movementId: stringOrNull(raw.movement_id ?? raw.movementId),
    postedJournalId: stringOrNull(raw.posted_journal_id ?? raw.postedJournalId),
    reversalAdjustmentId: stringOrNull(raw.reversal_adjustment_id ?? raw.reversalAdjustmentId),
  };
}

export function adaptInventoryLocation(raw: RawInventoryLocation): InventoryLocation {
  return {
    id: String(raw.id ?? ""),
    organizationId: stringOrNull(raw.organization_id ?? raw.organizationId),
    code: typeof raw.code === "string" ? raw.code : "LOC",
    name: typeof raw.name === "string" ? raw.name : "Location",
    description: stringOrNull(raw.description),
    isActive: booleanOrDefault(raw.is_active ?? raw.isActive, true),
    archivedAt: stringOrNull(raw.archived_at ?? raw.archivedAt),
  };
}

export function adaptInventoryValuation(raw: RawInventoryValuation): InventoryValuationSummary {
  const items = Array.isArray(raw.items) ? raw.items.map((item) => adaptInventoryBalance(item as RawInventoryBalance)) : [];
  return {
    valuationMethod: String(raw.valuation_method ?? raw.valuationMethod ?? "weighted_average") as InventoryValuationSummary["valuationMethod"],
    totalQuantityOnHand: sanitizeDecimalInput((raw.total_quantity_on_hand ?? raw.totalQuantityOnHand ?? 0) as string | number | null | undefined),
    totalInventoryValue: sanitizeDecimalInput((raw.total_inventory_value ?? raw.totalInventoryValue ?? 0) as string | number | null | undefined),
    items,
  };
}
