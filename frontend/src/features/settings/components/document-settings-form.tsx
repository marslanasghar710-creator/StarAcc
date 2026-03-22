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
  };
}

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
        <div className="grid gap-4 md:grid-cols-2">
          {(["invoice_prefix", "bill_prefix", "journal_prefix", "credit_note_prefix"] as const).map((name) => (
            <FormField key={name} control={form.control} name={name} render={({ field }) => (<FormItem><FormLabel>{name.replaceAll("_", " ")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={readOnly || isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          ))}
        </div>
        {!readOnly ? <div className="flex justify-end"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save document settings"}</Button></div> : null}
      </form>
    </Form>
  );
}
