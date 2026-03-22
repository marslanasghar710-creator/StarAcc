"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { organizationPreferencesSchema, type OrganizationPreferencesFormValues } from "@/features/settings/schemas";
import type { OrganizationPreferences } from "@/features/settings/types";
import { ApiError } from "@/lib/api/errors";

function defaults(preferences: OrganizationPreferences): OrganizationPreferencesFormValues {
  return {
    name: preferences.name,
    legal_name: preferences.legalName ?? "",
    registration_number: preferences.registrationNumber ?? "",
    tax_number: preferences.taxNumber ?? "",
    base_currency: preferences.baseCurrency ?? "USD",
    timezone: preferences.timezone ?? "UTC",
    country: preferences.country ?? "",
    contact_email: preferences.contactEmail ?? "",
    contact_phone: preferences.contactPhone ?? "",
    website: preferences.website ?? "",
    fiscal_year_start_month: String(preferences.fiscalYearStartMonth ?? 1),
    fiscal_year_start_day: String(preferences.fiscalYearStartDay ?? 1),
  };
}

export function OrganizationPreferencesForm({ preferences, onSubmit, isSubmitting, readOnly = false }: { preferences: OrganizationPreferences; onSubmit: (values: OrganizationPreferencesFormValues) => Promise<void>; isSubmitting?: boolean; readOnly?: boolean }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<OrganizationPreferencesFormValues>({ resolver: zodResolver(organizationPreferencesSchema), defaultValues: defaults(preferences) });

  React.useEffect(() => {
    form.reset(defaults(preferences));
    setServerError(null);
  }, [form, preferences]);

  async function handleSubmit(values: OrganizationPreferencesFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save organization preferences.");
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
        <InlineValidationMessage message={serverError} />
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            ["name", "Organization name"],
            ["legal_name", "Legal name"],
            ["registration_number", "Registration number"],
            ["tax_number", "Tax identifier"],
            ["base_currency", "Base currency"],
            ["timezone", "Timezone"],
            ["country", "Country"],
            ["contact_email", "Contact email"],
            ["contact_phone", "Contact phone"],
            ["website", "Website"],
            ["fiscal_year_start_month", "Fiscal year start month"],
            ["fiscal_year_start_day", "Fiscal year start day"],
          ].map(([name, label]) => (
            <FormField
              key={name}
              control={form.control}
              name={name as keyof OrganizationPreferencesFormValues}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input {...field} value={String(field.value ?? "")} disabled={readOnly || isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        {!readOnly ? <div className="flex justify-end"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save organization"}</Button></div> : null}
      </form>
    </Form>
  );
}
