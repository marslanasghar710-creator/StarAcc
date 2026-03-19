import { z } from "zod";

import { addDecimalStrings, compareDecimalStrings, isNonNegativeDecimal, sanitizeDecimalInput } from "@/lib/accounting/decimal";

const decimalStringSchema = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .refine((value) => /^\d+(\.\d{1,8})?$/.test(value), "Amount must be a valid decimal with up to 8 decimal places")
  .refine((value) => isNonNegativeDecimal(value), "Amount cannot be negative");

export const journalLineSchema = z
  .object({
    account_id: z.string().uuid("Account is required"),
    description: z.string().trim().max(500, "Description must be 500 characters or fewer").optional().or(z.literal("")),
    debit_amount: decimalStringSchema,
    credit_amount: decimalStringSchema,
  })
  .superRefine((value, context) => {
    const debit = sanitizeDecimalInput(value.debit_amount);
    const credit = sanitizeDecimalInput(value.credit_amount);

    if (compareDecimalStrings(debit, 0) > 0 && compareDecimalStrings(credit, 0) > 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "A line cannot have both debit and credit values", path: ["credit_amount"] });
    }

    if (compareDecimalStrings(debit, 0) === 0 && compareDecimalStrings(credit, 0) === 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Enter either a debit or a credit amount", path: ["debit_amount"] });
    }
  });

export const journalFormSchema = z.object({
  entry_date: z.string().trim().min(1, "Entry date is required"),
  description: z.string().trim().min(1, "Description is required").max(500, "Description must be 500 characters or fewer"),
  reference: z.string().trim().max(100, "Reference must be 100 characters or fewer").optional().or(z.literal("")),
  lines: z.array(journalLineSchema).min(2, "At least two journal lines are required"),
});

export const journalReverseSchema = z.object({
  reversal_date: z.string().trim().min(1, "Reversal date is required"),
  reason: z.string().trim().min(1, "Reason is required").max(500, "Reason must be 500 characters or fewer"),
});

export function getJournalDraftTotals(lines: Array<{ debit_amount?: string; credit_amount?: string }>) {
  const totalDebit = addDecimalStrings(lines.map((line) => line.debit_amount ?? "0"));
  const totalCredit = addDecimalStrings(lines.map((line) => line.credit_amount ?? "0"));

  return {
    totalDebit,
    totalCredit,
    isBalanced: compareDecimalStrings(totalDebit, totalCredit) === 0,
  };
}

export type JournalFormValues = z.infer<typeof journalFormSchema>;
export type JournalReverseFormValues = z.infer<typeof journalReverseSchema>;
