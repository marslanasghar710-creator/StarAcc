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
import { employeeFormSchema, type EmployeeFormValues } from "@/features/payroll/schemas";
import type { Employee } from "@/features/payroll/types";
import { ApiError } from "@/lib/api/errors";

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On leave" },
  { value: "terminated", label: "Terminated" },
] as const;

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contractor", label: "Contractor" },
  { value: "casual", label: "Casual" },
] as const;

function defaultValues(employee?: Employee | null): EmployeeFormValues {
  return {
    first_name: employee?.firstName ?? "",
    last_name: employee?.lastName ?? "",
    email: employee?.email ?? "",
    employee_number: employee?.employeeNumber ?? "",
    employment_status: employee?.employmentStatus ?? "active",
    employment_type: employee?.employmentType ?? "full_time",
    start_date: employee?.startDate ?? "",
    end_date: employee?.endDate ?? "",
    pay_schedule: employee?.paySchedule ?? "",
    pay_frequency: employee?.payFrequency ?? "",
    default_hours: employee?.defaultHours ?? "",
    default_rate: employee?.defaultRate ?? "",
    currency_code: employee?.currencyCode ?? "",
    notes: employee?.notes ?? "",
  };
}

export function EmployeeFormDialog({ open, onOpenChange, employee, onSubmit, isSubmitting, defaultCurrencyCode }: { open: boolean; onOpenChange: (open: boolean) => void; employee?: Employee | null; onSubmit: (values: EmployeeFormValues) => Promise<void>; isSubmitting?: boolean; defaultCurrencyCode?: string | null; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<EmployeeFormValues>({ resolver: zodResolver(employeeFormSchema), defaultValues: defaultValues(employee) });

  React.useEffect(() => {
    form.reset({ ...defaultValues(employee), currency_code: defaultValues(employee).currency_code || defaultCurrencyCode || "" });
    setServerError(null);
  }, [defaultCurrencyCode, employee, form, open]);

  async function handleSubmit(values: EmployeeFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save employee.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{employee ? `Edit ${employee.displayName}` : "Add employee"}</DialogTitle>
          <DialogDescription>Create or update payroll employee master data while leaving payroll calculations to the backend.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["first_name", "First name", "Alex"],
                ["last_name", "Last name", "Rivera"],
                ["email", "Email", "alex@example.com"],
                ["employee_number", "Employee number", "EMP-1001"],
                ["pay_schedule", "Pay schedule", "Biweekly payroll"],
                ["pay_frequency", "Pay frequency", "Biweekly"],
                ["default_hours", "Default hours", "80"],
                ["default_rate", "Default rate", "2500.00"],
                ["currency_code", "Currency", "USD"],
              ].map(([name, label, placeholder]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name as keyof EmployeeFormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input {...field} value={String(field.value ?? "")} placeholder={placeholder} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormField control={form.control} name="employment_status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment status</FormLabel>
                  <FormControl>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                      {EMPLOYMENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="employment_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment type</FormLabel>
                  <FormControl>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                      {EMPLOYMENT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="end_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>End date</FormLabel>
                  <FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Optional payroll notes visible to admins and payroll operators." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : employee ? "Save changes" : "Create employee"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
