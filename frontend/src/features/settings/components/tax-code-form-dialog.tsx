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
import { taxCodeSchema, type TaxCodeFormValues } from "@/features/settings/schemas";
import type { TaxCodeRecord } from "@/features/settings/types";
import { ApiError } from "@/lib/api/errors";

function defaults(taxCode?: TaxCodeRecord | null): TaxCodeFormValues {
  return {
    name: taxCode?.name ?? "",
    code: taxCode?.code ?? "",
    rate: taxCode?.rate ?? "0",
    type: taxCode?.type ?? "",
    description: taxCode?.description ?? "",
    applies_to_sales: taxCode?.appliesToSales ?? true,
    applies_to_purchases: taxCode?.appliesToPurchases ?? true,
    is_active: taxCode?.isActive ?? true,
  };
}

export function TaxCodeFormDialog({ open, onOpenChange, taxCode, onSubmit, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; taxCode?: TaxCodeRecord | null; onSubmit: (values: TaxCodeFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<TaxCodeFormValues>({ resolver: zodResolver(taxCodeSchema), defaultValues: defaults(taxCode) });

  React.useEffect(() => {
    form.reset(defaults(taxCode));
    setServerError(null);
  }, [form, taxCode, open]);

  async function handleSubmit(values: TaxCodeFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save tax code.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{taxCode ? `Edit ${taxCode.name}` : "Create tax code"}</DialogTitle>
          <DialogDescription>Tax rates and validity remain backend-owned. Frontend validation is for UX only.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="rate" render={({ field }) => (<FormItem><FormLabel>Rate</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            {(["applies_to_sales", "applies_to_purchases", "is_active"] as const).map((name) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (<FormItem className="rounded-lg border border-border/70 p-3"><FormLabel className="flex items-center justify-between"><span>{name.replaceAll("_", " ")}</span><input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} /></FormLabel><FormMessage /></FormItem>)} />
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : taxCode ? "Save tax code" : "Create tax code"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
