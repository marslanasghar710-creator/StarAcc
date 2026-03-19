"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Account } from "@/features/accounts/types";
import { CustomerSelect } from "@/features/invoices/components/customer-select";
import { InvoiceLineItemsEditor } from "@/features/invoices/components/invoice-line-items-editor";
import { InvoiceTotalsCard } from "@/features/invoices/components/invoice-totals-card";
import { getInvoiceDraftPreview, invoiceFormSchema, type InvoiceFormValues } from "@/features/invoices/schemas";
import type { Invoice } from "@/features/invoices/types";
import type { Customer } from "@/features/customers/types";
import { ApiError } from "@/lib/api/errors";

function defaultValues(invoice?: Invoice | null, prefilledCustomerId?: string | null): InvoiceFormValues {
  return {
    customer_id: invoice?.customerId ?? prefilledCustomerId ?? "",
    issue_date: invoice?.issueDate ?? new Date().toISOString().slice(0, 10),
    due_date: invoice?.dueDate ?? new Date().toISOString().slice(0, 10),
    currency_code: invoice?.currencyCode ?? "USD",
    reference: invoice?.reference ?? "",
    customer_po_number: invoice?.customerPoNumber ?? "",
    notes: invoice?.notes ?? "",
    terms: invoice?.terms ?? "",
    items: invoice?.items.length
      ? invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          account_id: item.accountId,
          item_code: item.itemCode ?? "",
          discount_percent: item.discountPercent ?? "",
          discount_amount: item.discountAmount ?? "",
          tax_code_id: item.taxCodeId ?? "",
        }))
      : [{ description: "", quantity: "1", unit_price: "0", account_id: "", item_code: "", discount_percent: "", discount_amount: "", tax_code_id: "" }],
  };
}

export function InvoiceForm({
  invoice,
  customers,
  accountOptions,
  onSubmit,
  isSubmitting,
  submitLabel,
  readOnly = false,
  prefilledCustomerId,
}: {
  invoice?: Invoice | null;
  customers: Customer[];
  accountOptions: Account[];
  onSubmit: (values: InvoiceFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel: string;
  readOnly?: boolean;
  prefilledCustomerId?: string | null;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: defaultValues(invoice, prefilledCustomerId),
  });
  const fieldArray = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const currencyCode = form.watch("currency_code");
  const preview = React.useMemo(() => getInvoiceDraftPreview(items), [items]);

  React.useEffect(() => {
    form.reset(defaultValues(invoice, prefilledCustomerId));
    setServerError(null);
  }, [form, invoice, prefilledCustomerId]);

  async function handleSubmit(values: InvoiceFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save invoice.");
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        <PageActionBar
          left={<InlineValidationMessage message={serverError} />}
          right={
            <>
              <Button variant="outline" asChild>
                <Link href="/invoices">Cancel</Link>
              </Button>
              {!readOnly ? <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : submitLabel}</Button> : null}
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
          <div className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>{invoice ? "Invoice details" : "New invoice"}</CardTitle>
                <CardDescription>Draft commercial data entry. Backend validation remains authoritative for totals, taxes, and status transitions.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Customer</FormLabel>
                      <CustomerSelect value={field.value} onChange={field.onChange} customers={customers} disabled={readOnly || Boolean(invoice)} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="issue_date" render={({ field }) => (<FormItem><FormLabel>Issue date</FormLabel><FormControl><Input type="date" {...field} disabled={readOnly || Boolean(invoice)} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="due_date" render={({ field }) => (<FormItem><FormLabel>Due date</FormLabel><FormControl><Input type="date" {...field} disabled={readOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="currency_code" render={({ field }) => (<FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field} value={field.value ?? ""} maxLength={3} disabled={readOnly || Boolean(invoice)} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="customer_po_number" render={({ field }) => (<FormItem><FormLabel>Customer PO</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="terms" render={({ field }) => (<FormItem><FormLabel>Terms</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>

            <InvoiceLineItemsEditor form={form} fieldArray={fieldArray} accountOptions={accountOptions} currencyCode={currencyCode} readOnly={readOnly} />
          </div>
          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <InvoiceTotalsCard invoice={invoice} previewSubtotal={preview.previewSubtotal} />
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Workflow notes</CardTitle>
                <CardDescription>Operational guidance for sales and AR teams.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Draft invoices stay editable until the backend moves them into a non-draft status.</p>
                <p>Line preview is client-side only and excludes authoritative backend tax/totals recalculation.</p>
                <p>Revenue accounts are required for backend posting and item validation.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
