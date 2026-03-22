import { z } from "zod";

const optionalText = z.string().trim().max(255).optional().or(z.literal(""));
const optionalLongText = z.string().trim().max(2000).optional().or(z.literal(""));
const decimalRate = z.string().trim().min(1, "Rate is required").refine((value) => /^-?\d+(\.\d{1,4})?$/.test(value), "Rate must be a valid decimal");

export const organizationPreferencesSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(255),
  legal_name: optionalText,
  registration_number: optionalText,
  tax_number: optionalText,
  base_currency: z.string().trim().min(3, "Currency is required").max(3),
  timezone: z.string().trim().min(1, "Timezone is required").max(100),
  country: optionalText,
  contact_email: z.string().trim().email("Email must be valid").optional().or(z.literal("")),
  contact_phone: optionalText,
  website: z.string().trim().url("Website must be valid").optional().or(z.literal("")),
  fiscal_year_start_month: z.string().trim().regex(/^([1-9]|1[0-2])$/, "Month must be between 1 and 12"),
  fiscal_year_start_day: z.string().trim().regex(/^([1-9]|[12]\d|3[01])$/, "Day must be between 1 and 31"),
});

export const fiscalPeriodSchema = z.object({
  name: z.string().trim().min(1, "Period name is required").max(255),
  start_date: z.string().trim().min(1, "Start date is required"),
  end_date: z.string().trim().min(1, "End date is required"),
  notes: optionalLongText,
}).refine((value) => value.start_date <= value.end_date, {
  message: "End date must be after start date",
  path: ["end_date"],
});

export const taxCodeSchema = z.object({
  name: z.string().trim().min(1, "Tax code name is required").max(255),
  code: z.string().trim().min(1, "Tax code is required").max(50),
  rate: decimalRate,
  type: optionalText,
  description: optionalLongText,
  applies_to_sales: z.boolean(),
  applies_to_purchases: z.boolean(),
  is_active: z.boolean(),
});

export const documentSettingsSchema = z.object({
  invoice_prefix: optionalText,
  bill_prefix: optionalText,
  journal_prefix: optionalText,
  credit_note_prefix: optionalText,
});

export const accountingSettingsSchema = z.object({
  default_locale: optionalText,
  date_format: optionalText,
  number_format: optionalText,
  tax_enabled: z.boolean(),
  multi_currency_enabled: z.boolean(),
  base_currency: optionalText,
  timezone: optionalText,
});

export type OrganizationPreferencesFormValues = z.infer<typeof organizationPreferencesSchema>;
export type FiscalPeriodFormValues = z.infer<typeof fiscalPeriodSchema>;
export type TaxCodeFormValues = z.infer<typeof taxCodeSchema>;
export type DocumentSettingsFormValues = z.infer<typeof documentSettingsSchema>;
export type AccountingSettingsFormValues = z.infer<typeof accountingSettingsSchema>;
