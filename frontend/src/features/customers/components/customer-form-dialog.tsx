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
import { customerFormSchema, type CustomerFormValues } from "@/features/customers/schemas";
import type { Customer } from "@/features/customers/types";
import { ApiError } from "@/lib/api/errors";

function defaultValues(customer?: Customer | null): CustomerFormValues {
  return {
    display_name: customer?.displayName ?? "",
    legal_name: customer?.legalName ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    website: customer?.website ?? "",
    tax_number: customer?.taxNumber ?? "",
    currency_code: customer?.currencyCode ?? "",
    payment_terms_days: customer?.paymentTermsDays != null ? String(customer.paymentTermsDays) : "",
    notes: customer?.notes ?? "",
    billing_address_line1: customer?.billingAddress.address_line1 ?? "",
    billing_address_line2: customer?.billingAddress.address_line2 ?? "",
    billing_city: customer?.billingAddress.city ?? "",
    billing_state: customer?.billingAddress.state ?? "",
    billing_postal_code: customer?.billingAddress.postal_code ?? "",
    billing_country: customer?.billingAddress.country ?? "",
    shipping_address_line1: customer?.shippingAddress.address_line1 ?? "",
    shipping_address_line2: customer?.shippingAddress.address_line2 ?? "",
    shipping_city: customer?.shippingAddress.city ?? "",
    shipping_state: customer?.shippingAddress.state ?? "",
    shipping_postal_code: customer?.shippingAddress.postal_code ?? "",
    shipping_country: customer?.shippingAddress.country ?? "",
    is_active: customer?.isActive ?? true,
  };
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: defaultValues(customer),
  });

  React.useEffect(() => {
    form.reset(defaultValues(customer));
    setServerError(null);
  }, [customer, form, open]);

  async function handleSubmit(values: CustomerFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save customer.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{customer ? `Edit ${customer.displayName}` : "Create customer"}</DialogTitle>
          <DialogDescription>Maintain customer contact, billing, and receivables metadata for the active organization.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                ["display_name", "Display name", "Acme Corp"],
                ["legal_name", "Legal name", "Acme Corporation LLC"],
                ["email", "Email", "billing@acme.com"],
                ["phone", "Phone", "+1 555 0100"],
                ["website", "Website", "https://acme.com"],
                ["tax_number", "Tax number", "VAT/Tax ID"],
                ["currency_code", "Currency", "USD"],
                ["payment_terms_days", "Payment terms (days)", "30"],
              ].map(([name, label, placeholder]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name as keyof CustomerFormValues}
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
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} placeholder="Internal notes or customer guidance" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-border/70 p-4">
                <h3 className="font-medium">Billing address</h3>
                {[
                  ["billing_address_line1", "Address line 1"],
                  ["billing_address_line2", "Address line 2"],
                  ["billing_city", "City"],
                  ["billing_state", "State / region"],
                  ["billing_postal_code", "Postal code"],
                  ["billing_country", "Country"],
                ].map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name as keyof CustomerFormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input {...field} value={String(field.value ?? "")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <div className="space-y-4 rounded-xl border border-border/70 p-4">
                <h3 className="font-medium">Shipping address</h3>
                {[
                  ["shipping_address_line1", "Address line 1"],
                  ["shipping_address_line2", "Address line 2"],
                  ["shipping_city", "City"],
                  ["shipping_state", "State / region"],
                  ["shipping_postal_code", "Postal code"],
                  ["shipping_country", "Country"],
                ].map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name as keyof CustomerFormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input {...field} value={String(field.value ?? "")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="rounded-lg border border-border/70 p-3">
                  <FormLabel className="flex items-center justify-between gap-3">
                    <span>Active customer</span>
                    <input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">Inactive customers remain visible historically but should be excluded from new sales workflows.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : customer ? "Save changes" : "Create customer"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
