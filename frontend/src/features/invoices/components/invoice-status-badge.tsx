import { Badge } from "@/components/ui/badge";
import { getInvoiceDisplayStatus } from "@/features/invoices/schemas";
import type { Invoice } from "@/features/invoices/types";

export function InvoiceStatusBadge({ invoice }: { invoice: Pick<Invoice, "status" | "amountDue" | "dueDate"> }) {
  const displayStatus = getInvoiceDisplayStatus(invoice.status, invoice.amountDue, invoice.dueDate);
  const variant = displayStatus === "paid" ? "success" : displayStatus === "partially_paid" ? "warning" : displayStatus === "draft" ? "secondary" : displayStatus === "voided" || displayStatus === "cancelled" || displayStatus === "overdue" ? "danger" : "outline";
  return <Badge variant={variant} className="capitalize">{displayStatus.replace("_", " ")}</Badge>;
}
