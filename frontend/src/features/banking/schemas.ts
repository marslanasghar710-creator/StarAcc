import { z } from "zod";

const decimalStringSchema = z.string().trim().min(1, "Amount is required").refine((value) => /^-?\d+(\.\d{1,8})?$/.test(value), "Amount must be a valid decimal with up to 8 decimal places");

export const bankAccountFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  display_name: z.string().trim().max(255).optional().or(z.literal("")),
  bank_name: z.string().trim().max(255).optional().or(z.literal("")),
  account_number_masked: z.string().trim().max(64).optional().or(z.literal("")),
  iban_masked: z.string().trim().max(64).optional().or(z.literal("")),
  currency_code: z.string().trim().min(1, "Currency is required").max(3),
  account_type: z.string().trim().max(50).optional().or(z.literal("")),
  gl_account_id: z.string().uuid("GL account is required"),
  opening_balance: z.string().trim().regex(/^$|^-?\d+(\.\d{1,8})?$/, "Opening balance must be a valid decimal"),
  opening_balance_date: z.string().trim().optional().or(z.literal("")),
  is_active: z.boolean(),
  is_default_receipts_account: z.boolean(),
  is_default_payments_account: z.boolean(),
});

export const bankImportUploadSchema = z.object({
  bank_account_id: z.string().uuid("Bank account is required"),
  source: z.string().trim().max(100).optional().or(z.literal("")),
  mapping_json: z.string().trim().max(5000).optional().or(z.literal("")),
  file: z.instanceof(File, { message: "Statement file is required" }),
});

export const cashCodeSchema = z.object({
  target_account_id: z.string().uuid("Target account is required"),
  description: z.string().trim().min(1, "Description is required").max(500),
  tax_code_id: z.string().uuid("Tax code must be valid").optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const transferSchema = z.object({
  destination_bank_account_id: z.string().uuid("Destination bank account is required"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  source_bank_account_id: z.string().uuid(),
}).superRefine((value, context) => {
  if (value.destination_bank_account_id === value.source_bank_account_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["destination_bank_account_id"], message: "Destination bank account must be different" });
  }
});

export const ignoreTransactionSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const bankRuleFormSchema = z.object({
  name: z.string().trim().min(1, "Rule name is required").max(255),
  is_active: z.boolean(),
  priority: z.string().trim().regex(/^$|^\d+$/, "Priority must be a whole number"),
  applies_to_bank_account_id: z.string().uuid("Bank account must be valid").optional().or(z.literal("")),
  match_payee_contains: z.string().trim().max(255).optional().or(z.literal("")),
  match_description_contains: z.string().trim().max(255).optional().or(z.literal("")),
  match_reference_contains: z.string().trim().max(255).optional().or(z.literal("")),
  match_amount_exact: decimalStringSchema.optional().or(z.literal("")),
  match_amount_min: decimalStringSchema.optional().or(z.literal("")),
  match_amount_max: decimalStringSchema.optional().or(z.literal("")),
  direction: z.string().trim().min(1, "Direction is required"),
  action_type: z.string().trim().min(1, "Action type is required"),
  target_account_id: z.string().uuid("Target account is required when needed").optional().or(z.literal("")),
  auto_reconcile: z.boolean(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (["cash_code", "transfer"].includes(value.action_type) && !value.target_account_id && value.action_type === "cash_code") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["target_account_id"], message: "Target account is required for cash code rules" });
  }
});

export const bankRuleTestSchema = z.object({
  sample_description: z.string().trim().max(500).optional().or(z.literal("")),
  sample_payee: z.string().trim().max(255).optional().or(z.literal("")),
  sample_reference: z.string().trim().max(255).optional().or(z.literal("")),
  sample_amount: decimalStringSchema,
});

export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>;
export type BankImportUploadValues = z.infer<typeof bankImportUploadSchema>;
export type CashCodeFormValues = z.infer<typeof cashCodeSchema>;
export type TransferFormValues = z.infer<typeof transferSchema>;
export type IgnoreTransactionFormValues = z.infer<typeof ignoreTransactionSchema>;
export type BankRuleFormValues = z.infer<typeof bankRuleFormSchema>;
export type BankRuleTestValues = z.infer<typeof bankRuleTestSchema>;
