"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { inventoryItemFormSchema, type InventoryItemFormValues } from "@/features/inventory/schemas";
import type { InventoryItem } from "@/features/inventory/types";
import { ApiError } from "@/lib/api/errors";

function defaultValues(item?: InventoryItem | null): InventoryItemFormValues {
  return {
    sku: item?.sku ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    is_active: item?.isActive ?? true,
    is_sellable: item?.isSellable ?? true,
    is_purchasable: item?.isPurchasable ?? true,
    is_tracked_inventory: item?.isTrackedInventory ?? false,
    unit_of_measure: item?.unitOfMeasure ?? "",
    sales_price: item?.salesPrice ?? "",
    purchase_price: item?.purchasePrice ?? "",
    income_account_id: item?.incomeAccountId ?? "",
    expense_account_id: item?.expenseAccountId ?? "",
    inventory_asset_account_id: item?.inventoryAssetAccountId ?? "",
    sales_tax_code_id: item?.salesTaxCodeId ?? "",
    purchase_tax_code_id: item?.purchaseTaxCodeId ?? "",
  };
}

type SelectFieldName = "income_account_id" | "expense_account_id" | "inventory_asset_account_id" | "sales_tax_code_id" | "purchase_tax_code_id";

function SelectField({
  form,
  name,
  label,
  options,
  placeholder,
}: {
  form: ReturnType<typeof useForm<InventoryItemFormValues>>;
  name: SelectFieldName;
  label: string;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
}) {
  const sentinel = "__none__";
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value || sentinel} onValueChange={(value) => field.onChange(value === sentinel ? "" : value)}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={sentinel}>None</SelectItem>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ItemFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isSubmitting,
  accountOptions,
  taxCodeOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  onSubmit: (values: InventoryItemFormValues) => Promise<void>;
  isSubmitting?: boolean;
  accountOptions: Array<{ label: string; value: string }>;
  taxCodeOptions: Array<{ label: string; value: string }>;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: defaultValues(item),
  });

  React.useEffect(() => {
    form.reset(defaultValues(item));
    setServerError(null);
  }, [form, item, open]);

  async function handleSubmit(values: InventoryItemFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save inventory item.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${item.name}` : "Create inventory item"}</DialogTitle>
          <DialogDescription>Maintain backend-backed product master data, default accounts, and tax references for the active organization.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU / code</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="SKU-100" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Office chair" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unit_of_measure" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of measure</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="Each" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="sales_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Default sales price</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="0.00" inputMode="decimal" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="purchase_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Default purchase price</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="0.00" inputMode="decimal" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="rounded-lg border border-border/70 p-3">
                <p className="font-medium">Workflow flags</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ["is_active", "Active item", "Inactive items remain historical only."],
                    ["is_sellable", "Sellable", "Expose as a sales-side item where supported."],
                    ["is_purchasable", "Purchasable", "Expose as a purchasing-side item where supported."],
                    ["is_tracked_inventory", "Tracked inventory", "Backend stock and valuation rules will apply."],
                  ].map(([name, label, description]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name as keyof InventoryItemFormValues}
                      render={({ field }) => (
                        <FormItem className="rounded-md border border-border/60 p-3">
                          <FormLabel className="flex items-center justify-between gap-3">
                            <span>{label}</span>
                            <input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">{description}</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Operational notes or internal product description" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 lg:grid-cols-2">
              <SelectField form={form} name="income_account_id" label="Income account" options={accountOptions} placeholder="Select revenue account" />
              <SelectField form={form} name="expense_account_id" label="Expense account" options={accountOptions} placeholder="Select expense account" />
              <SelectField form={form} name="inventory_asset_account_id" label="Inventory asset account" options={accountOptions} placeholder="Select inventory asset account" />
              <SelectField form={form} name="sales_tax_code_id" label="Sales tax code" options={taxCodeOptions} placeholder="Select sales tax code" />
              <SelectField form={form} name="purchase_tax_code_id" label="Purchase tax code" options={taxCodeOptions} placeholder="Select purchase tax code" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : item ? "Save changes" : "Create item"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
