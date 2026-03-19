"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { PeriodStatusBanner } from "@/features/journals/components/period-status-banner";
import { JournalLinesEditor } from "@/features/journals/components/journal-lines-editor";
import { JournalTotalsCard } from "@/features/journals/components/journal-totals-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Account } from "@/features/accounts/types";
import { journalFormSchema, getJournalDraftTotals, type JournalFormValues } from "@/features/journals/schemas";
import type { Journal } from "@/features/journals/types";
import type { Period } from "@/features/periods/types";
import { resolvePeriodForDate } from "@/lib/accounting/periods";
import { ApiError } from "@/lib/api/errors";

function getDefaultValues(journal?: Journal | null): JournalFormValues {
  return {
    entry_date: journal?.entryDate ?? new Date().toISOString().slice(0, 10),
    description: journal?.description ?? "",
    reference: journal?.reference ?? "",
    lines: journal?.lines?.length
      ? journal.lines.map((line) => ({
          account_id: line.accountId,
          description: line.description ?? "",
          debit_amount: line.debitAmount,
          credit_amount: line.creditAmount,
        }))
      : [
          { account_id: "", description: "", debit_amount: "0", credit_amount: "0" },
          { account_id: "", description: "", debit_amount: "0", credit_amount: "0" },
        ],
  };
}

export function JournalForm({
  journal,
  periods,
  accountOptions,
  onSubmit,
  isSubmitting,
  submitLabel,
  readOnly = false,
}: {
  journal?: Journal | null;
  periods: Period[];
  accountOptions: Account[];
  onSubmit: (values: JournalFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalFormSchema),
    defaultValues: getDefaultValues(journal),
  });
  const fieldArray = useFieldArray({ control: form.control, name: "lines" });
  const lines = form.watch("lines");
  const entryDate = form.watch("entry_date");
  const totals = React.useMemo(() => getJournalDraftTotals(lines), [lines]);
  const resolvedPeriod = React.useMemo(() => resolvePeriodForDate(periods, entryDate), [entryDate, periods]);

  React.useEffect(() => {
    form.reset(getDefaultValues(journal));
    setServerError(null);
  }, [form, journal]);

  async function handleSubmit(values: JournalFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save journal.");
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
                <Link href="/journals">Cancel</Link>
              </Button>
              {!readOnly ? <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : submitLabel}</Button> : null}
            </>
          }
        />

        <PeriodStatusBanner period={resolvedPeriod} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
          <div className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>{journal ? "Journal entry" : "New journal entry"}</CardTitle>
                <CardDescription>Capture a draft. The backend remains responsible for posting rules and validation.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="entry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="External reference" disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} placeholder="Describe the accounting event" disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <JournalLinesEditor form={form} fieldArray={fieldArray} accountOptions={accountOptions} readOnly={readOnly} />
            {form.formState.errors.lines?.root?.message ? <InlineValidationMessage message={form.formState.errors.lines.root.message} /> : null}
          </div>
          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <JournalTotalsCard totalDebit={totals.totalDebit} totalCredit={totals.totalCredit} isBalanced={totals.isBalanced} />
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Workflow notes</CardTitle>
                <CardDescription>Frontend guidance for accounting operators.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Draft journals can be edited until posted, subject to permissions and backend checks.</p>
                <p>Closed or locked periods are highlighted here, but backend validation ultimately controls saving and posting.</p>
                <p>Account selectors only show active postable accounts that are currently available in the chart.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
