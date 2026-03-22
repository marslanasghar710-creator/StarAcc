import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { getBillDisplayStatus } from "@/features/bills/schemas";
import type { Bill } from "@/features/bills/types";

function resolveVariant(displayStatus: string): BadgeProps["variant"] {
  if (displayStatus === "paid") return "success";
  if (displayStatus === "partially_paid") return "warning";
  if (displayStatus === "draft") return "secondary";
  if (displayStatus === "voided" || displayStatus === "cancelled" || displayStatus === "overdue") return "danger";
  return "outline";
}

export function BillStatusBadge({ bill }: { bill: Pick<Bill, "status" | "amountDue" | "dueDate"> }) {
  const displayStatus = getBillDisplayStatus(bill.status, bill.amountDue, bill.dueDate);
  return <Badge variant={resolveVariant(displayStatus)} className="capitalize">{displayStatus.replace("_", " ")}</Badge>;
}
