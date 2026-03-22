export type InventoryMovementType = "opening" | "purchase" | "sale" | "adjustment_in" | "adjustment_out" | "transfer_in" | "transfer_out" | "reversal";
export type InventoryAdjustmentType = "opening_stock" | "quantity_write_up" | "quantity_write_down";
export type InventorySourceEntityType = "opening_stock" | "bill" | "invoice" | "adjustment" | "transfer" | "manual";
export type InventoryValuationMethod = "weighted_average";

export type RawInventoryItem = Record<string, unknown>;
export type RawInventoryBalance = Record<string, unknown>;
export type RawInventoryMovement = Record<string, unknown>;
export type RawInventoryAdjustment = Record<string, unknown>;
export type RawInventoryValuation = Record<string, unknown>;
export type RawInventoryLocation = Record<string, unknown>;

export type InventoryItem = {
  id: string;
  organizationId: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  isSellable: boolean;
  isPurchasable: boolean;
  isTrackedInventory: boolean;
  unitOfMeasure: string | null;
  salesPrice: string | null;
  purchasePrice: string | null;
  incomeAccountId: string | null;
  expenseAccountId: string | null;
  inventoryAssetAccountId: string | null;
  salesTaxCodeId: string | null;
  purchaseTaxCodeId: string | null;
  costingMethod: string | null;
  valuationMethod: string | null;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type InventoryBalance = {
  itemId: string;
  itemName: string;
  sku: string | null;
  locationId: string | null;
  locationName: string | null;
  quantityOnHand: string;
  reservedQuantity: string;
  availableQuantity: string;
  averageUnitCost: string;
  inventoryValue: string;
  updatedAt: string | null;
};

export type InventoryMovement = {
  id: string;
  organizationId: string | null;
  itemId: string;
  locationId: string | null;
  movementType: InventoryMovementType;
  sourceEntityType: InventorySourceEntityType | string;
  sourceEntityId: string | null;
  quantity: string;
  unitCost: string;
  totalCost: string;
  quantityBalanceAfter: string | null;
  inventoryValueAfter: string | null;
  averageUnitCostAfter: string | null;
  occurredAt: string | null;
  postedAt: string | null;
  notes: string | null;
  reversalOfMovementId: string | null;
  accountingJournalId: string | null;
};

export type InventoryAdjustment = {
  id: string;
  organizationId: string | null;
  itemId: string;
  locationId: string | null;
  adjustmentType: InventoryAdjustmentType;
  quantity: string;
  unitCost: string;
  totalCost: string;
  reason: string;
  notes: string | null;
  offsetAccountId: string;
  occurredAt: string;
  movementId: string | null;
  postedJournalId: string | null;
  reversalAdjustmentId: string | null;
};

export type InventoryLocation = {
  id: string;
  organizationId: string | null;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  archivedAt: string | null;
};

export type InventoryValuationSummary = {
  valuationMethod: InventoryValuationMethod | string;
  totalQuantityOnHand: string;
  totalInventoryValue: string;
  items: InventoryBalance[];
};

export type InventoryItemMutationPayload = {
  sku?: string | null;
  name: string;
  description?: string | null;
  is_active?: boolean;
  is_sellable: boolean;
  is_purchasable: boolean;
  is_tracked_inventory: boolean;
  unit_of_measure?: string | null;
  sales_price?: string | null;
  purchase_price?: string | null;
  income_account_id?: string | null;
  expense_account_id?: string | null;
  inventory_asset_account_id?: string | null;
  sales_tax_code_id?: string | null;
  purchase_tax_code_id?: string | null;
};

export type InventoryAdjustmentMutationPayload = {
  item_id: string;
  location_id?: string | null;
  adjustment_type: InventoryAdjustmentType;
  quantity: string;
  unit_cost?: string | null;
  reason: string;
  notes?: string | null;
  offset_account_id: string;
  occurred_at: string;
};
