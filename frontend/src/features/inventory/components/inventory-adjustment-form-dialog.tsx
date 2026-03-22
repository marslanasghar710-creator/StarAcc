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
import { inventoryAdjustmentFormSchema, type InventoryAdjustmentFormValues } from "@/features/inventory/schemas";
import { ApiError } from "@/lib/api/errors";

function localDateTimeValue() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function defaultValues(): InventoryAdjustmentFormValues {
  return {
    item_id: "",
    location_id: "",
    adjustment_type: "quantity_write_up",
    quantity: "",
    unit_cost: "",
    reason: "",
    notes: "",
    offset_account_id: "",
    occurred_at: localDateTimeValue(),
  };
}

function SelectControl({
  form,
  name,
  label,
  options,
  placeholder,
  allowNone = false,
}: {
  form: ReturnType<typeof useForm<InventoryAdjustmentFormValues>>;
  name: keyof InventoryAdjustmentFormValues;
  label: string;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  allowNone?: boolean;
}) {
  const sentinel = "__none__";
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value || (allowNone ? sentinel : undefined)} onValueChange={(value) => field.onChange(value === sentinel ? "" : value)}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {allowNone ? <SelectItem value={sentinel}>None</SelectItem> : null}
              {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function InventoryAdjustmentFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  itemOptions,
  accountOptions,
  locationOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InventoryAdjustmentFormValues) => Promise<void>;
  isSubmitting?: boolean;
  itemOptions: Array<{ label: string; value: string }>;
  accountOptions: Array<{ label: string; value: string }>;
  locationOptions: Array<{ label: string; value: string }>;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<InventoryAdjustmentFormValues>({
    resolver: zodResolver(inventoryAdjustmentFormSchema),
    defaultValues: defaultValues(),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues());
      setServerError(null);
    }
  }, [form, open]);

  async function handleSubmit(values: InventoryAdjustmentFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to post inventory adjustment.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create inventory adjustment</DialogTitle>
          <DialogDescription>Submit a stock write-up, write-down, or opening balance adjustment through the backend inventory service.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectControl form={form} name="item_id" label="Item" options={itemOptions} placeholder="Select inventory item" />
              <SelectControl form={form} name="adjustment_type" label="Adjustment type" options={[
                { label: "Opening stock", value: "opening_stock" },
                { label: "Quantity write-up", value: "quantity_write_up" },
                { label: "Quantity write-down", value: "quantity_write_down" },
              ]} placeholder="Select adjustment type" />
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity delta</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" placeholder="10" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unit_cost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit cost</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" placeholder="Optional cost basis" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <SelectControl form={form} name="offset_account_id" label="Offset account" options={accountOptions} placeholder="Select offset account" />
              <SelectControl form={form} name="location_id" label="Location" options={locationOptions} placeholder="Select location" allowNone />
              <FormField control={form.control} name="occurred_at" render={({ field }) => (
                <FormItem>
                  <FormLabel>Occurred at</FormLabel>
                  <FormControl><Input {...field} type="datetime-local" value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl><Input {...field} placeholder="Cycle count variance" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Optional operational notes" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Create adjustment"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
