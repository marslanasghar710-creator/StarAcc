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
import { BillLineItemsEditor } from "@/features/bills/components/bill-line-items-editor";
import { BillTotalsCard } from "@/features/bills/components/bill-totals-card";
import { SupplierSelect } from "@/features/bills/components/supplier-select";
import { billFormSchema, getBillDraftPreview, type BillFormValues } from "@/features/bills/schemas";
import type { Bill } from "@/features/bills/types";
import type { Supplier } from "@/features/suppliers/types";
import { ApiError } from "@/lib/api/errors";

function defaultValues(bill?: Bill | null, prefilledSupplierId?: string | null): BillFormValues {
  return {
    supplier_id: bill?.supplierId ?? prefilledSupplierId ?? "",
    issue_date: bill?.issueDate ?? new Date().toISOString().slice(0, 10),
    due_date: bill?.dueDate ?? new Date().toISOString().slice(0, 10),
    currency_code: bill?.currencyCode ?? "USD",
    reference: bill?.reference ?? "",
    supplier_invoice_number: bill?.supplierInvoiceNumber ?? "",
    notes: bill?.notes ?? "",
    terms: bill?.terms ?? "",
    items: bill?.items.length ? bill.items.map((item) => ({ id: item.id, description: item.description, quantity: item.quantity, unit_price: item.unitPrice, account_id: item.accountId, item_code: item.itemCode ?? "", discount_percent: item.discountPercent ?? "", discount_amount: item.discountAmount ?? "", tax_code_id: item.taxCodeId ?? "" })) : [{ description: "", quantity: "1", unit_price: "0", account_id: "", item_code: "", discount_percent: "", discount_amount: "", tax_code_id: "" }],
  };
}

export function BillForm({ bill, suppliers, accountOptions, onSubmit, isSubmitting, submitLabel, readOnly = false, prefilledSupplierId }: { bill?: Bill | null; suppliers: Supplier[]; accountOptions: Account[]; onSubmit: (values: BillFormValues) => Promise<void>; isSubmitting?: boolean; submitLabel: string; readOnly?: boolean; prefilledSupplierId?: string | null; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<BillFormValues>({ resolver: zodResolver(billFormSchema), defaultValues: defaultValues(bill, prefilledSupplierId) });
  const fieldArray = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const currencyCode = form.watch("currency_code");
  const preview = React.useMemo(() => getBillDraftPreview(items), [items]);

  React.useEffect(() => {
    form.reset(defaultValues(bill, prefilledSupplierId));
    setServerError(null);
  }, [form, bill, prefilledSupplierId]);

  async function handleSubmit(values: BillFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save bill.");
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        <PageActionBar left={<InlineValidationMessage message={serverError} />} right={<><Button variant="outline" asChild><Link href={bill ? `/bills/${bill.id}` : "/bills"}>Cancel</Link></Button>{!readOnly ? <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : submitLabel}</Button> : null}</>} />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
          <div className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>{bill ? "Bill details" : "New bill"}</CardTitle>
                <CardDescription>Draft AP data entry. Backend validation remains authoritative for totals, taxes, and posting state.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="supplier_id" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Supplier</FormLabel><SupplierSelect value={field.value} onChange={field.onChange} suppliers={suppliers} disabled={readOnly || Boolean(bill)} /><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="issue_date" render={({ field }) => (<FormItem><FormLabel>Issue date</FormLabel><FormControl><Input type="date" {...field} disabled={readOnly || Boolean(bill)} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="due_date" render={({ field }) => (<FormItem><FormLabel>Due date</FormLabel><FormControl><Input type="date" {...field} disabled={readOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="currency_code" render={({ field }) => (<FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field} value={field.value ?? ""} maxLength={3} disabled={readOnly || Boolean(bill)} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="supplier_invoice_number" render={({ field }) => (<FormItem><FormLabel>Supplier invoice #</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="terms" render={({ field }) => (<FormItem><FormLabel>Terms</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>
            <BillLineItemsEditor form={form} fieldArray={fieldArray} accountOptions={accountOptions} currencyCode={currencyCode} readOnly={readOnly} />
          </div>
          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <BillTotalsCard bill={bill} previewSubtotal={preview.previewSubtotal} />
            <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Workflow notes</CardTitle><CardDescription>Operational guidance for procurement and AP teams.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Draft bills stay editable until the backend moves them into a non-draft status.</p><p>Line preview is client-side only and excludes authoritative backend tax/totals recalculation.</p><p>Expense accounts should align with backend posting and period rules before approval/posting.</p></CardContent></Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
