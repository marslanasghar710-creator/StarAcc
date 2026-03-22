"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { accountingSettingsSchema, type AccountingSettingsFormValues } from "@/features/settings/schemas";
import type { AccountingSettings } from "@/features/settings/types";
import { ApiError } from "@/lib/api/errors";

function defaults(settings?: AccountingSettings | null): AccountingSettingsFormValues {
  return {
    default_locale: settings?.defaultLocale ?? "",
    date_format: settings?.dateFormat ?? "",
    number_format: settings?.numberFormat ?? "",
    tax_enabled: settings?.taxEnabled ?? false,
    multi_currency_enabled: settings?.multiCurrencyEnabled ?? false,
    base_currency: settings?.baseCurrency ?? "",
    timezone: settings?.timezone ?? "",
    week_start_day: settings?.weekStartDay === null || settings?.weekStartDay === undefined ? "" : String(settings.weekStartDay) as AccountingSettingsFormValues["week_start_day"],
    default_document_language: settings?.defaultDocumentLanguage ?? "",
  };
}

const TEXT_FIELDS = [
  ["default_locale", "Default locale"],
  ["date_format", "Date format"],
  ["number_format", "Number format"],
  ["base_currency", "Base currency"],
  ["timezone", "Timezone"],
  ["week_start_day", "Week start day"],
  ["default_document_language", "Default document language"],
] as const;

export function AccountingSettingsForm({ settings, onSubmit, isSubmitting, readOnly = false }: { settings?: AccountingSettings | null; onSubmit: (values: AccountingSettingsFormValues) => Promise<void>; isSubmitting?: boolean; readOnly?: boolean }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<AccountingSettingsFormValues>({ resolver: zodResolver(accountingSettingsSchema), defaultValues: defaults(settings) });

  React.useEffect(() => {
    form.reset(defaults(settings));
    setServerError(null);
  }, [form, settings]);

  async function handleSubmit(values: AccountingSettingsFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save accounting settings.");
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <InlineValidationMessage message={serverError} />
        <div className="space-y-4 rounded-xl border border-border/70 p-4">
          <div>
            <h3 className="text-sm font-semibold">Regional and posting defaults</h3>
            <p className="text-xs text-muted-foreground">These remain display and default-preference values; posting and validation rules stay in backend services.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {TEXT_FIELDS.map(([name, label]) => (
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
        <div className="grid gap-4 md:grid-cols-2">
          {(["tax_enabled", "multi_currency_enabled"] as const).map((name) => (
            <FormField key={name} control={form.control} name={name} render={({ field }) => (
              <FormItem className="rounded-lg border border-border/70 p-3">
                <FormLabel className="flex items-center justify-between gap-3">
                  <span>{name.replaceAll("_", " ")}</span>
                  <input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} disabled={readOnly || isSubmitting} />
                </FormLabel>
                <FormMessage />
              </FormItem>
            )} />
          ))}
        </div>
        {!readOnly ? <div className="flex justify-end"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save accounting settings"}</Button></div> : null}
      </form>
    </Form>
  );
}
