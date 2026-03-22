"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { documentSettingsSchema, type DocumentSettingsFormValues } from "@/features/settings/schemas";
import type { DocumentSettings } from "@/features/settings/types";
import { ApiError } from "@/lib/api/errors";

function defaults(settings?: DocumentSettings | null): DocumentSettingsFormValues {
  return {
    invoice_prefix: settings?.invoicePrefix ?? "",
    bill_prefix: settings?.billPrefix ?? "",
    journal_prefix: settings?.journalPrefix ?? "",
    credit_note_prefix: settings?.creditNotePrefix ?? "",
    payment_prefix: settings?.paymentPrefix ?? "",
    supplier_credit_prefix: settings?.supplierCreditPrefix ?? "",
    supplier_payment_prefix: settings?.supplierPaymentPrefix ?? "",
    quote_prefix: settings?.quotePrefix ?? "",
    purchase_order_prefix: settings?.purchaseOrderPrefix ?? "",
    next_invoice_number: settings?.nextInvoiceNumber ? String(settings.nextInvoiceNumber) : "",
    next_bill_number: settings?.nextBillNumber ? String(settings.nextBillNumber) : "",
    next_journal_number: settings?.nextJournalNumber ? String(settings.nextJournalNumber) : "",
    next_credit_note_number: settings?.nextCreditNoteNumber ? String(settings.nextCreditNoteNumber) : "",
  };
}

const PREFIX_FIELDS = [
  ["invoice_prefix", "Invoice prefix"],
  ["bill_prefix", "Bill prefix"],
  ["journal_prefix", "Journal prefix"],
  ["credit_note_prefix", "Credit note prefix"],
  ["payment_prefix", "Payment prefix"],
  ["supplier_credit_prefix", "Supplier credit prefix"],
  ["supplier_payment_prefix", "Supplier payment prefix"],
  ["quote_prefix", "Quote prefix"],
  ["purchase_order_prefix", "Purchase order prefix"],
] as const;

const NEXT_NUMBER_FIELDS = [
  ["next_invoice_number", "Next invoice number"],
  ["next_bill_number", "Next bill number"],
  ["next_journal_number", "Next journal number"],
  ["next_credit_note_number", "Next credit note number"],
] as const;

export function DocumentSettingsForm({ settings, onSubmit, isSubmitting, readOnly = false }: { settings?: DocumentSettings | null; onSubmit: (values: DocumentSettingsFormValues) => Promise<void>; isSubmitting?: boolean; readOnly?: boolean }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<DocumentSettingsFormValues>({ resolver: zodResolver(documentSettingsSchema), defaultValues: defaults(settings) });

  React.useEffect(() => {
    form.reset(defaults(settings));
    setServerError(null);
  }, [form, settings]);

  async function handleSubmit(values: DocumentSettingsFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save document settings.");
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <InlineValidationMessage message={serverError} />
        <div className="space-y-4 rounded-xl border border-border/70 p-4">
          <div>
            <h3 className="text-sm font-semibold">Prefixes</h3>
            <p className="text-xs text-muted-foreground">These values are saved only through backend-backed numbering endpoints.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PREFIX_FIELDS.map(([name, label]) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} disabled={readOnly || isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-border/70 p-4">
          <div>
            <h3 className="text-sm font-semibold">Sequence previews</h3>
            <p className="text-xs text-muted-foreground">Shown only when the backend exposes next-number values.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {NEXT_NUMBER_FIELDS.map(([name, label]) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} disabled={readOnly || isSubmitting} inputMode="numeric" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ))}
          </div>
        </div>
        {!readOnly ? <div className="flex justify-end"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save document settings"}</Button></div> : null}
      </form>
    </Form>
  );
}
