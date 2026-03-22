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
import { supplierFormSchema, type SupplierFormValues } from "@/features/suppliers/schemas";
import type { Supplier } from "@/features/suppliers/types";
import { ApiError } from "@/lib/api/errors";

function defaultValues(supplier?: Supplier | null): SupplierFormValues {
  return {
    display_name: supplier?.displayName ?? "",
    legal_name: supplier?.legalName ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    website: supplier?.website ?? "",
    tax_number: supplier?.taxNumber ?? "",
    currency_code: supplier?.currencyCode ?? "",
    payment_terms_days: supplier?.paymentTermsDays != null ? String(supplier.paymentTermsDays) : "",
    notes: supplier?.notes ?? "",
    billing_address_line1: supplier?.billingAddress.address_line1 ?? "",
    billing_address_line2: supplier?.billingAddress.address_line2 ?? "",
    billing_city: supplier?.billingAddress.city ?? "",
    billing_state: supplier?.billingAddress.state ?? "",
    billing_postal_code: supplier?.billingAddress.postal_code ?? "",
    billing_country: supplier?.billingAddress.country ?? "",
    remittance_address_line1: supplier?.remittanceAddress.address_line1 ?? "",
    remittance_address_line2: supplier?.remittanceAddress.address_line2 ?? "",
    remittance_city: supplier?.remittanceAddress.city ?? "",
    remittance_state: supplier?.remittanceAddress.state ?? "",
    remittance_postal_code: supplier?.remittanceAddress.postal_code ?? "",
    remittance_country: supplier?.remittanceAddress.country ?? "",
    is_active: supplier?.isActive ?? true,
  };
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onSubmit, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; supplier?: Supplier | null; onSubmit: (values: SupplierFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<SupplierFormValues>({ resolver: zodResolver(supplierFormSchema), defaultValues: defaultValues(supplier) });

  React.useEffect(() => {
    form.reset(defaultValues(supplier));
    setServerError(null);
  }, [supplier, form, open]);

  async function handleSubmit(values: SupplierFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save supplier.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{supplier ? `Edit ${supplier.displayName}` : "Create supplier"}</DialogTitle>
          <DialogDescription>Maintain supplier contact, remittance, and purchasing metadata for the active organization.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                ["display_name", "Display name", "Northwind Supplies"],
                ["legal_name", "Legal name", "Northwind Supplies LLC"],
                ["email", "Email", "ap@northwind.com"],
                ["phone", "Phone", "+1 555 0100"],
                ["website", "Website", "https://northwind.example"],
                ["tax_number", "Tax number", "VAT/Tax ID"],
                ["currency_code", "Currency", "USD"],
                ["payment_terms_days", "Payment terms (days)", "30"],
              ].map(([name, label, placeholder]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name as keyof SupplierFormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input {...field} value={String(field.value ?? "")} placeholder={placeholder} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Internal purchasing or payment guidance" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-border/70 p-4">
                <h3 className="font-medium">Billing address</h3>
                {[["billing_address_line1", "Address line 1"],["billing_address_line2", "Address line 2"],["billing_city", "City"],["billing_state", "State / region"],["billing_postal_code", "Postal code"],["billing_country", "Country"]].map(([name, label]) => (
                  <FormField key={name} control={form.control} name={name as keyof SupplierFormValues} render={({ field }) => (
                    <FormItem><FormLabel>{label}</FormLabel><FormControl><Input {...field} value={String(field.value ?? "")} /></FormControl><FormMessage /></FormItem>
                  )} />
                ))}
              </div>
              <div className="space-y-4 rounded-xl border border-border/70 p-4">
                <h3 className="font-medium">Remittance address</h3>
                {[["remittance_address_line1", "Address line 1"],["remittance_address_line2", "Address line 2"],["remittance_city", "City"],["remittance_state", "State / region"],["remittance_postal_code", "Postal code"],["remittance_country", "Country"]].map(([name, label]) => (
                  <FormField key={name} control={form.control} name={name as keyof SupplierFormValues} render={({ field }) => (
                    <FormItem><FormLabel>{label}</FormLabel><FormControl><Input {...field} value={String(field.value ?? "")} /></FormControl><FormMessage /></FormItem>
                  )} />
                ))}
              </div>
            </div>
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="rounded-lg border border-border/70 p-3">
                <FormLabel className="flex items-center justify-between gap-3">
                  <span>Active supplier</span>
                  <input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                </FormLabel>
                <p className="text-sm text-muted-foreground">Inactive suppliers remain available historically but should be excluded from new bills and purchasing workflows.</p>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : supplier ? "Save changes" : "Create supplier"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
