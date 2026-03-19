import { z } from "zod";

import { addDecimalStrings, compareDecimalStrings, multiplyDecimalStrings } from "@/lib/accounting/decimal";
import type { Invoice, InvoiceStatus } from "@/features/invoices/types";

const decimalStringSchema = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .refine((value) => /^\d+(\.\d{1,8})?$/.test(value), "Amount must be a valid decimal with up to 8 decimal places");

export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(500, "Description must be 500 characters or fewer"),
  quantity: decimalStringSchema.refine((value) => compareDecimalStrings(value, 0) > 0, "Quantity must be greater than zero"),
  unit_price: decimalStringSchema.refine((value) => compareDecimalStrings(value, 0) >= 0, "Unit price cannot be negative"),
  account_id: z.string().uuid("Revenue account is required"),
  item_code: z.string().trim().max(100).optional().or(z.literal("")),
  discount_percent: z.string().trim().regex(/^$|^\d+(\.\d{1,4})?$/, "Discount percent must be a decimal with up to 4 places"),
  discount_amount: z.string().trim().regex(/^$|^\d+(\.\d{1,8})?$/, "Discount amount must be a valid decimal"),
  tax_code_id: z.string().uuid("Tax code must be valid").optional().or(z.literal("")),
});

export const invoiceFormSchema = z.object({
  customer_id: z.string().uuid("Customer is required"),
  issue_date: z.string().trim().min(1, "Issue date is required"),
  due_date: z.string().trim().min(1, "Due date is required"),
  currency_code: z.string().trim().min(1, "Currency is required").max(3, "Currency code must be 3 characters or fewer"),
  reference: z.string().trim().max(100).optional().or(z.literal("")),
  customer_po_number: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  terms: z.string().trim().max(5000).optional().or(z.literal("")),
  items: z.array(invoiceLineItemSchema).min(1, "At least one invoice line is required"),
}).superRefine((value, context) => {
  if (value.issue_date && value.due_date && value.due_date < value.issue_date) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Due date cannot be before issue date",
      path: ["due_date"],
    });
  }
});

export const invoiceSendSchema = z.object({
  recipient_email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
});

export function getInvoiceDraftPreview(items: Array<{ quantity?: string; unit_price?: string }>) {
  const subtotal = addDecimalStrings(items.map((item) => multiplyDecimalStrings(item.quantity ?? "0", item.unit_price ?? "0")));
  return {
    lineCount: items.length,
    previewSubtotal: subtotal,
  };
}

export function getInvoicePaymentTone(invoice: Pick<Invoice, "status" | "amountDue" | "amountPaid" | "dueDate">) {
  if (invoice.status === "voided" || invoice.status === "cancelled") return "danger" as const;
  if (compareDecimalStrings(invoice.amountDue, 0) === 0 && compareDecimalStrings(invoice.amountPaid, 0) > 0) return "success" as const;
  if (compareDecimalStrings(invoice.amountPaid, 0) > 0 && compareDecimalStrings(invoice.amountDue, 0) > 0) return "warning" as const;
  const isPastDue = compareDecimalStrings(invoice.amountDue, 0) > 0 && invoice.dueDate < new Date().toISOString().slice(0, 10);
  return isPastDue ? ("danger" as const) : ("secondary" as const);
}

export function getInvoiceDisplayStatus(status: InvoiceStatus, amountDue: string, dueDate: string) {
  if (status === "sent" && compareDecimalStrings(amountDue, 0) > 0 && dueDate < new Date().toISOString().slice(0, 10)) {
    return "overdue" as const;
  }

  return status;
}

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type InvoiceSendFormValues = z.infer<typeof invoiceSendSchema>;
