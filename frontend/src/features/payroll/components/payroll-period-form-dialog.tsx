"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { payrollPeriodFormSchema, type PayrollPeriodFormValues } from "@/features/payroll/schemas";
import { ApiError } from "@/lib/api/errors";

export function PayrollPeriodFormDialog({ open, onOpenChange, onSubmit, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: PayrollPeriodFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<PayrollPeriodFormValues>({
    resolver: zodResolver(payrollPeriodFormSchema),
    defaultValues: { name: "", start_date: "", end_date: "", payment_date: "", frequency: "" },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ name: "", start_date: "", end_date: "", payment_date: "", frequency: "" });
      setServerError(null);
    }
  }, [form, open]);

  async function handleSubmit(values: PayrollPeriodFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to create payroll period.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create payroll period</DialogTitle>
          <DialogDescription>Define the pay period dates and payment date. Calculations still happen only in the backend.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            {[
              ["name", "Period name", "March 2026 payroll"],
              ["frequency", "Frequency", "Monthly"],
            ].map(([name, label, placeholder]) => (
              <FormField key={name} control={form.control} name={name as keyof PayrollPeriodFormValues} render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl><Input {...field} value={String(field.value ?? "")} placeholder={placeholder} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ))}
            <div className="grid gap-4 md:grid-cols-3">
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem><FormLabel>Start date</FormLabel><FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="end_date" render={({ field }) => (
                <FormItem><FormLabel>End date</FormLabel><FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="payment_date" render={({ field }) => (
                <FormItem><FormLabel>Payment date</FormLabel><FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create period"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
