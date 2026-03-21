import { z } from "zod";

import { addDecimalStrings, compareDecimalStrings, multiplyDecimalStrings } from "@/lib/accounting/decimal";
import type { Bill, BillStatus } from "@/features/bills/types";

const decimalStringSchema = z.string().trim().min(1, "Amount is required").refine((value) => /^\d+(\.\d{1,8})?$/.test(value), "Amount must be a valid decimal with up to 8 decimal places");

export const billLineItemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().trim().min(1, "Description is required").max(500, "Description must be 500 characters or fewer"),
  quantity: decimalStringSchema.refine((value) => compareDecimalStrings(value, 0) > 0, "Quantity must be greater than zero"),
  unit_price: decimalStringSchema.refine((value) => compareDecimalStrings(value, 0) >= 0, "Unit price cannot be negative"),
  account_id: z.string().uuid("Expense account is required"),
  item_code: z.string().trim().max(100).optional().or(z.literal("")),
  discount_percent: z.string().trim().regex(/^$|^\d+(\.\d{1,4})?$/, "Discount percent must be a decimal with up to 4 places"),
  discount_amount: z.string().trim().regex(/^$|^\d+(\.\d{1,8})?$/, "Discount amount must be a valid decimal"),
  tax_code_id: z.string().uuid("Tax code must be valid").optional().or(z.literal("")),
});

export const billFormSchema = z.object({
  supplier_id: z.string().uuid("Supplier is required"),
  issue_date: z.string().trim().min(1, "Issue date is required"),
  due_date: z.string().trim().min(1, "Due date is required"),
  currency_code: z.string().trim().min(1, "Currency is required").max(3, "Currency code must be 3 characters or fewer"),
  reference: z.string().trim().max(100).optional().or(z.literal("")),
  supplier_invoice_number: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  terms: z.string().trim().max(5000).optional().or(z.literal("")),
  items: z.array(billLineItemSchema).min(1, "At least one bill line is required"),
}).superRefine((value, context) => {
  if (value.issue_date && value.due_date && value.due_date < value.issue_date) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Due date cannot be before issue date", path: ["due_date"] });
  }
});

export function getBillDraftPreview(items: Array<{ quantity?: string; unit_price?: string }>) {
  const subtotal = addDecimalStrings(items.map((item) => multiplyDecimalStrings(item.quantity ?? "0", item.unit_price ?? "0")));
  return { lineCount: items.length, previewSubtotal: subtotal };
}

export function getBillDisplayStatus(status: BillStatus, amountDue: string, dueDate: string) {
  if ((status === "approved" || status === "posted") && compareDecimalStrings(amountDue, 0) > 0 && dueDate < new Date().toISOString().slice(0, 10)) {
    return "overdue" as const;
  }
  return status;
}

export function getBillPaymentTone(bill: Pick<Bill, "status" | "amountDue" | "amountPaid" | "dueDate">) {
  if (bill.status === "voided" || bill.status === "cancelled") return "danger" as const;
  if (compareDecimalStrings(bill.amountDue, 0) === 0 && compareDecimalStrings(bill.amountPaid, 0) > 0) return "success" as const;
  if (compareDecimalStrings(bill.amountPaid, 0) > 0 && compareDecimalStrings(bill.amountDue, 0) > 0) return "warning" as const;
  const isPastDue = compareDecimalStrings(bill.amountDue, 0) > 0 && bill.dueDate < new Date().toISOString().slice(0, 10);
  return isPastDue ? ("danger" as const) : ("secondary" as const);
}

export type BillFormValues = z.infer<typeof billFormSchema>;
