import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InventoryAdjustmentFormDialog } from "@/features/inventory/components/inventory-adjustment-form-dialog";
import { InventoryStatusBadge } from "@/features/inventory/components/inventory-status-badge";
import { inventoryAdjustmentFormSchema, inventoryItemFormSchema } from "@/features/inventory/schemas";

describe("inventory schemas", () => {
  it("validates tracked item account references and decimal fields", () => {
    expect(
      inventoryItemFormSchema.safeParse({
        sku: "SKU-1",
        name: "Tracked item",
        description: "",
        is_active: true,
        is_sellable: true,
        is_purchasable: true,
        is_tracked_inventory: true,
        unit_of_measure: "Each",
        sales_price: "12.50",
        purchase_price: "8.00",
        income_account_id: "",
        expense_account_id: "",
        inventory_asset_account_id: "",
        sales_tax_code_id: "",
        purchase_tax_code_id: "",
      }).success,
    ).toBe(false);

    expect(
      inventoryItemFormSchema.safeParse({
        sku: "SKU-2",
        name: "Non-tracked item",
        description: "",
        is_active: true,
        is_sellable: true,
        is_purchasable: false,
        is_tracked_inventory: false,
        unit_of_measure: "Each",
        sales_price: "12.50",
        purchase_price: "",
        income_account_id: "",
        expense_account_id: "",
        inventory_asset_account_id: "",
        sales_tax_code_id: "",
        purchase_tax_code_id: "",
      }).success,
    ).toBe(true);
  });

  it("validates adjustment quantity and timestamp fields", () => {
    expect(
      inventoryAdjustmentFormSchema.safeParse({
        item_id: "11111111-1111-1111-1111-111111111111",
        location_id: "",
        adjustment_type: "quantity_write_down",
        quantity: "0",
        unit_cost: "1.25",
        reason: "Shrinkage",
        notes: "",
        offset_account_id: "22222222-2222-2222-2222-222222222222",
        occurred_at: "2026-03-22T12:00",
      }).success,
    ).toBe(false);
  });
});

describe("inventory UI states", () => {
  it("renders status badges and adjustment dialog copy", () => {
    render(
      <>
        <InventoryStatusBadge kind="tracked" value />
        <InventoryStatusBadge kind="movement" value="sale" />
        <InventoryAdjustmentFormDialog
          open
          onOpenChange={() => {}}
          onSubmit={async () => {}}
          itemOptions={[{ label: "SKU-1 · Widget", value: "11111111-1111-1111-1111-111111111111" }]}
          accountOptions={[{ label: "5000 · Inventory Adj", value: "22222222-2222-2222-2222-222222222222" }]}
          locationOptions={[]}
        />
      </>,
    );

    expect(screen.getByText("Tracked")).toBeInTheDocument();
    expect(screen.getByText("sale")).toBeInTheDocument();
    expect(screen.getByText(/Create inventory adjustment/i)).toBeInTheDocument();
    expect(screen.getByText(/backend inventory service/i)).toBeInTheDocument();
  });
});
