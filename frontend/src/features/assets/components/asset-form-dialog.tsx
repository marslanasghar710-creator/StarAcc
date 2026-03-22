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
import { assetFormSchema, type AssetFormValues } from "@/features/assets/schemas";
import type { Asset } from "@/features/assets/types";
import { ApiError } from "@/lib/api/errors";

function defaultValues(asset?: Asset | null): AssetFormValues {
  return {
    name: asset?.name ?? "",
    description: asset?.description ?? "",
    asset_category_id: asset?.assetCategoryId ?? "",
    acquisition_date: asset?.acquisitionDate?.slice(0, 10) ?? "",
    acquisition_cost: asset?.acquisitionCost ?? "",
    useful_life_months: asset?.usefulLifeMonths != null ? String(asset.usefulLifeMonths) : "",
    depreciation_method: asset?.depreciationMethod ?? "straight_line",
    residual_value: asset?.residualValue ?? "0",
    depreciation_start_date: asset?.depreciationStartDate?.slice(0, 10) ?? asset?.acquisitionDate?.slice(0, 10) ?? "",
  };
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  onSubmit,
  isSubmitting,
  categoryOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset | null;
  onSubmit: (values: AssetFormValues) => Promise<void>;
  isSubmitting?: boolean;
  categoryOptions: Array<{ label: string; value: string }>;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: defaultValues(asset),
  });

  React.useEffect(() => {
    form.reset(defaultValues(asset));
    setServerError(null);
  }, [asset, form, open]);

  async function handleSubmit(values: AssetFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save fixed asset.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{asset ? `Edit ${asset.name}` : "Create fixed asset"}</DialogTitle>
          <DialogDescription>Maintain fixed-asset master data while keeping depreciation schedules and valuation truth in the backend.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset name</FormLabel>
                  <FormControl><Input {...field} placeholder="Office fit-out" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="asset_category_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value || "__none__"} onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {categoryOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="acquisition_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquisition date</FormLabel>
                  <FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="depreciation_start_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Depreciation start date</FormLabel>
                  <FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="acquisition_cost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquisition cost</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" placeholder="0.00" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="residual_value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Residual value</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" placeholder="0.00" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="useful_life_months" render={({ field }) => (
                <FormItem>
                  <FormLabel>Useful life (months)</FormLabel>
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
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Operational context, serial numbers, or capitalization notes" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : asset ? "Save changes" : "Create asset"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
