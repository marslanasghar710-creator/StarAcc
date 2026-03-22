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
import { assetCategoryFormSchema, type AssetCategoryFormValues } from "@/features/assets/schemas";
import type { AssetCategory } from "@/features/assets/types";
import { ApiError } from "@/lib/api/errors";

function defaultValues(category?: AssetCategory | null): AssetCategoryFormValues {
  return {
    name: category?.name ?? "",
    default_useful_life_months: category?.defaultUsefulLifeMonths != null ? String(category.defaultUsefulLifeMonths) : "",
    depreciation_method: category?.depreciationMethod ?? "straight_line",
    asset_account_id: category?.assetAccountId ?? "",
    accumulated_depreciation_account_id: category?.accumulatedDepreciationAccountId ?? "",
    depreciation_expense_account_id: category?.depreciationExpenseAccountId ?? "",
  };
}

function SelectField({
  form,
  name,
  label,
  placeholder,
  options,
}: {
  form: ReturnType<typeof useForm<AssetCategoryFormValues>>;
  name: "asset_account_id" | "accumulated_depreciation_account_id" | "depreciation_expense_account_id";
  label: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value || "__none__"} onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}>
            <FormControl>
              <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function AssetCategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSubmit,
  isSubmitting,
  accountOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: AssetCategory | null;
  onSubmit: (values: AssetCategoryFormValues) => Promise<void>;
  isSubmitting?: boolean;
  accountOptions: Array<{ label: string; value: string }>;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<AssetCategoryFormValues>({
    resolver: zodResolver(assetCategoryFormSchema),
    defaultValues: defaultValues(category),
  });

  React.useEffect(() => {
    form.reset(defaultValues(category));
    setServerError(null);
  }, [category, form, open]);

  async function handleSubmit(values: AssetCategoryFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save asset category.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{category ? `Edit ${category.name}` : "Create asset category"}</DialogTitle>
          <DialogDescription>Define default depreciation behavior and account mappings for new fixed assets.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Computer equipment" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="default_useful_life_months" render={({ field }) => (
                <FormItem>
                  <FormLabel>Default useful life (months)</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} inputMode="numeric" placeholder="36" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="depreciation_method" render={({ field }) => (
                <FormItem>
                  <FormLabel>Depreciation method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select depreciation method" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="straight_line">Straight line</SelectItem>
                      <SelectItem value="declining_balance">Declining balance</SelectItem>
                      <SelectItem value="units_of_production">Units of production</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="rounded-lg border border-border/70 p-4 lg:col-span-2">
                <p className="font-medium">Account mappings</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <SelectField form={form} name="asset_account_id" label="Asset account" placeholder="Select asset account" options={accountOptions} />
                  <SelectField form={form} name="accumulated_depreciation_account_id" label="Accumulated depreciation account" placeholder="Select contra asset account" options={accountOptions} />
                  <SelectField form={form} name="depreciation_expense_account_id" label="Depreciation expense account" placeholder="Select expense account" options={accountOptions} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : category ? "Save changes" : "Create category"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
