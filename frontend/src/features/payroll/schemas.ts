import { z } from "zod";

const decimalPattern = /^-?\d+(?:\.\d{1,8})?$/;

export const employeeFormSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(120, "First name must be 120 characters or fewer"),
  last_name: z.string().trim().min(1, "Last name is required").max(120, "Last name must be 120 characters or fewer"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  employee_number: z.string().trim().max(60, "Employee number must be 60 characters or fewer").optional().or(z.literal("")),
  employment_status: z.string().trim().min(1, "Employment status is required"),
  employment_type: z.string().trim().min(1, "Employment type is required"),
  start_date: z.string().trim().min(1, "Start date is required"),
  end_date: z.string().trim().optional().or(z.literal("")),
  pay_schedule: z.string().trim().max(120, "Pay schedule must be 120 characters or fewer").optional().or(z.literal("")),
  pay_frequency: z.string().trim().max(120, "Pay frequency must be 120 characters or fewer").optional().or(z.literal("")),
  default_hours: z.string().trim().refine((value) => value === "" || decimalPattern.test(value), "Enter valid hours").optional(),
  default_rate: z.string().trim().refine((value) => value === "" || decimalPattern.test(value), "Enter a valid default rate").optional(),
  currency_code: z.string().trim().max(12, "Currency code must be 12 characters or fewer").optional().or(z.literal("")),
  notes: z.string().trim().max(2000, "Notes must be 2000 characters or fewer").optional().or(z.literal("")),
}).refine((value) => !value.end_date || value.end_date >= value.start_date, {
  message: "End date must be on or after the start date",
  path: ["end_date"],
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const payrollPeriodFormSchema = z.object({
  name: z.string().trim().max(120, "Name must be 120 characters or fewer").optional().or(z.literal("")),
  start_date: z.string().trim().min(1, "Start date is required"),
  end_date: z.string().trim().min(1, "End date is required"),
  payment_date: z.string().trim().optional().or(z.literal("")),
  frequency: z.string().trim().max(120, "Frequency must be 120 characters or fewer").optional().or(z.literal("")),
}).refine((value) => value.end_date >= value.start_date, {
  message: "End date must be on or after the start date",
  path: ["end_date"],
});

export type PayrollPeriodFormValues = z.infer<typeof payrollPeriodFormSchema>;

export const payrollRunFormSchema = z.object({
  payroll_period_id: z.string().trim().min(1, "Select a payroll period"),
  name: z.string().trim().max(120, "Name must be 120 characters or fewer").optional().or(z.literal("")),
  pay_date: z.string().trim().optional().or(z.literal("")),
});

export type PayrollRunFormValues = z.infer<typeof payrollRunFormSchema>;
