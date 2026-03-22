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
import { fiscalPeriodSchema, type FiscalPeriodFormValues } from "@/features/settings/schemas";
import type { FiscalPeriodRecord } from "@/features/settings/types";
import { ApiError } from "@/lib/api/errors";

function defaults(period?: FiscalPeriodRecord | null): FiscalPeriodFormValues {
  return {
    name: period?.name ?? "",
    start_date: period?.startDate ?? "",
    end_date: period?.endDate ?? "",
    notes: period?.notes ?? "",
  };
}

export function FiscalPeriodFormDialog({ open, onOpenChange, period, onSubmit, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; period?: FiscalPeriodRecord | null; onSubmit: (values: FiscalPeriodFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<FiscalPeriodFormValues>({ resolver: zodResolver(fiscalPeriodSchema), defaultValues: defaults(period) });

  React.useEffect(() => {
    form.reset(defaults(period));
    setServerError(null);
  }, [form, period, open]);

  async function handleSubmit(values: FiscalPeriodFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save fiscal period.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{period ? `Edit ${period.name}` : "Create fiscal period"}</DialogTitle>
          <DialogDescription>Maintain fiscal period definitions; close and reopen rules remain backend-controlled.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Period name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="start_date" render={({ field }) => (<FormItem><FormLabel>Start date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="end_date" render={({ field }) => (<FormItem><FormLabel>End date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : period ? "Save period" : "Create period"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
