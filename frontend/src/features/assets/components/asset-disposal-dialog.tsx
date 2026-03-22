"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { assetDisposalFormSchema, type AssetDisposalFormValues } from "@/features/assets/schemas";
import type { Asset } from "@/features/assets/types";
import { ApiError } from "@/lib/api/errors";

function defaultValues(asset?: Asset | null): AssetDisposalFormValues {
  return {
    disposal_date: asset?.disposalDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    disposal_proceeds: asset?.disposalProceeds ?? "",
    notes: "",
  };
}

export function AssetDisposalDialog({
  open,
  onOpenChange,
  asset,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset;
  onSubmit: (values: AssetDisposalFormValues) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<AssetDisposalFormValues>({
    resolver: zodResolver(assetDisposalFormSchema),
    defaultValues: defaultValues(asset),
  });

  React.useEffect(() => {
    form.reset(defaultValues(asset));
    setServerError(null);
  }, [asset, form, open]);

  async function handleSubmit(values: AssetDisposalFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to dispose fixed asset.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Dispose {asset.name}</DialogTitle>
          <DialogDescription>Record a backend-driven disposal so net book value, accumulated depreciation, and disposal accounting stay authoritative.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <FormField control={form.control} name="disposal_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Disposal date</FormLabel>
                <FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="disposal_proceeds" render={({ field }) => (
              <FormItem>
                <FormLabel>Disposal proceeds</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" placeholder="0.00" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Sale details, scrapped reason, or insurance recovery notes" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Disposing…" : "Dispose asset"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
