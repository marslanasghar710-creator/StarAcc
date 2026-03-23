"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { payrollRunFormSchema, type PayrollRunFormValues } from "@/features/payroll/schemas";
import type { PayrollPeriod } from "@/features/payroll/types";
import { ApiError } from "@/lib/api/errors";

export function PayrollRunFormDialog({ open, onOpenChange, onSubmit, isSubmitting, periods }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: PayrollRunFormValues) => Promise<void>; isSubmitting?: boolean; periods: PayrollPeriod[]; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<PayrollRunFormValues>({
    resolver: zodResolver(payrollRunFormSchema),
    defaultValues: { payroll_period_id: "", name: "", pay_date: "" },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ payroll_period_id: periods[0]?.id ?? "", name: "", pay_date: periods[0]?.paymentDate ?? "" });
      setServerError(null);
    }
  }, [form, open, periods]);

  async function handleSubmit(values: PayrollRunFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to create payroll run.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create payroll run</DialogTitle>
          <DialogDescription>Select the period to review, calculate, and eventually post using backend payroll workflows.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <FormField control={form.control} name="payroll_period_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Payroll period</FormLabel>
                <FormControl>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                    <option value="" disabled>Select a payroll period</option>
                    {periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Run name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="March 2026 live payroll" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="pay_date" render={({ field }) => (
              <FormItem><FormLabel>Pay date</FormLabel><FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || periods.length === 0}>{isSubmitting ? "Creating…" : "Create run"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
