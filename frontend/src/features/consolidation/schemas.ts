import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required"),
  reporting_currency: z.string().trim().length(3, "Use a 3-letter currency code"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const runConsolidationSchema = z.object({
  period_start: z.string().min(1, "Start date is required"),
  period_end: z.string().min(1, "End date is required"),
}).refine((value) => value.period_end >= value.period_start, {
  message: "End date must be on or after start date",
  path: ["period_end"],
});

export const eliminationLineSchema = z.object({
  account_code: z.string().min(1),
  account_name: z.string().min(1),
  account_type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  debit_amount: z.string().min(1),
  credit_amount: z.string().min(1),
});

export const createEliminationSchema = z.object({
  description: z.string().trim().min(1),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
  source_entities: z.array(z.string()).default([]),
  journal_lines: z.array(eliminationLineSchema).min(2),
}).refine((value) => value.period_end >= value.period_start, {
  message: "End date must be on or after start date",
  path: ["period_end"],
}).refine((value) => {
  const debit = value.journal_lines.reduce((sum, line) => sum + Number(line.debit_amount || 0), 0);
  const credit = value.journal_lines.reduce((sum, line) => sum + Number(line.credit_amount || 0), 0);
  return debit === credit;
}, {
  message: "Elimination lines must balance",
  path: ["journal_lines"],
});

export type CreateGroupValues = z.infer<typeof createGroupSchema>;
export type RunConsolidationValues = z.infer<typeof runConsolidationSchema>;
export type CreateEliminationValues = z.infer<typeof createEliminationSchema>;
