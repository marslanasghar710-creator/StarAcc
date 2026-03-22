import { z } from "zod";

export const comparisonModeSchema = z.enum(["none", "previous_period", "prior_year"]);
export const reportingBasisSchema = z.enum(["accrual", "cash"]);

const optionalDateSchema = z.string().trim().optional().or(z.literal(""));

export const trialBalanceFilterSchema = z.object({
  as_of_date: z.string().trim().min(1, "As-of date is required"),
  period_id: z.string().trim().optional().or(z.literal("")),
  account_type: z.string().trim().optional().or(z.literal("")),
  search: z.string().trim().max(255).optional().or(z.literal("")),
  include_zero_balances: z.boolean(),
});

export const profitLossFilterSchema = z.object({
  from_date: z.string().trim().min(1, "Start date is required"),
  to_date: z.string().trim().min(1, "End date is required"),
  period_id: z.string().trim().optional().or(z.literal("")),
  comparison_mode: comparisonModeSchema,
  basis: reportingBasisSchema.optional(),
}).refine((value) => value.from_date <= value.to_date, {
  message: "Start date must be before end date",
  path: ["to_date"],
});

export const balanceSheetFilterSchema = z.object({
  as_of_date: z.string().trim().min(1, "As-of date is required"),
  period_id: z.string().trim().optional().or(z.literal("")),
  comparison_mode: comparisonModeSchema,
});

export const generalLedgerFilterSchema = z.object({
  account_id: z.string().uuid("Account is required"),
  from_date: optionalDateSchema,
  to_date: optionalDateSchema,
  journal_reference: z.string().trim().max(255).optional().or(z.literal("")),
  source_module: z.string().trim().max(100).optional().or(z.literal("")),
  status: z.string().trim().max(50).optional().or(z.literal("")),
  cursor: z.string().trim().optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.from_date && value.to_date && value.from_date > value.to_date) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["to_date"],
      message: "Start date must be before end date",
    });
  }
});

export type TrialBalanceFilterValues = z.infer<typeof trialBalanceFilterSchema>;
export type ProfitLossFilterValues = z.infer<typeof profitLossFilterSchema>;
export type BalanceSheetFilterValues = z.infer<typeof balanceSheetFilterSchema>;
export type GeneralLedgerFilterValues = z.infer<typeof generalLedgerFilterSchema>;
