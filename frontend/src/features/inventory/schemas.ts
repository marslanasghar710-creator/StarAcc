import { z } from "zod";

const decimalPattern = /^-?\d+(?:\.\d{1,8})?$/;

export const inventoryItemFormSchema = z.object({
  sku: z.string().trim().max(100, "SKU must be 100 characters or fewer").optional().or(z.literal("")),
  name: z.string().trim().min(1, "Item name is required").max(255, "Item name must be 255 characters or fewer"),
  description: z.string().trim().max(1000, "Description must be 1000 characters or fewer").optional().or(z.literal("")),
  is_active: z.boolean(),
  is_sellable: z.boolean(),
  is_purchasable: z.boolean(),
  is_tracked_inventory: z.boolean(),
  unit_of_measure: z.string().trim().max(50, "Unit of measure must be 50 characters or fewer").optional().or(z.literal("")),
  sales_price: z.string().trim().refine((value) => value === "" || decimalPattern.test(value), "Enter a valid decimal amount").optional(),
  purchase_price: z.string().trim().refine((value) => value === "" || decimalPattern.test(value), "Enter a valid decimal amount").optional(),
  income_account_id: z.string().uuid("Select a valid income account").optional().or(z.literal("")),
  expense_account_id: z.string().uuid("Select a valid expense account").optional().or(z.literal("")),
  inventory_asset_account_id: z.string().uuid("Select a valid inventory asset account").optional().or(z.literal("")),
  sales_tax_code_id: z.string().uuid("Select a valid sales tax code").optional().or(z.literal("")),
  purchase_tax_code_id: z.string().uuid("Select a valid purchase tax code").optional().or(z.literal("")),
}).superRefine((values, context) => {
  if (values.is_tracked_inventory && !values.inventory_asset_account_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["inventory_asset_account_id"], message: "Tracked items should reference an inventory asset account." });
  }
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;

export const inventoryAdjustmentFormSchema = z.object({
  item_id: z.string().uuid("Select an inventory item"),
  location_id: z.string().uuid("Select a valid location").optional().or(z.literal("")),
  adjustment_type: z.enum(["opening_stock", "quantity_write_up", "quantity_write_down"], { required_error: "Adjustment type is required" }),
  quantity: z.string().trim().refine((value) => decimalPattern.test(value) && Number(value) !== 0, "Quantity must be a non-zero decimal amount"),
  unit_cost: z.string().trim().refine((value) => value === "" || decimalPattern.test(value), "Enter a valid decimal amount").optional(),
  reason: z.string().trim().min(1, "Reason is required").max(255, "Reason must be 255 characters or fewer"),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or fewer").optional().or(z.literal("")),
  offset_account_id: z.string().uuid("Select an offset account"),
  occurred_at: z.string().trim().min(1, "Adjustment timestamp is required"),
});

export type InventoryAdjustmentFormValues = z.infer<typeof inventoryAdjustmentFormSchema>;
