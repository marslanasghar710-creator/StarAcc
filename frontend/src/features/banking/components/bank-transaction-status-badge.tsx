import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";

export function BankTransactionStatusBadge({ status }: { status: string }) {
  const normalized = status || "unreconciled";
  const variant: BadgeProps["variant"] = normalized === "reconciled" ? "success" : normalized === "matched" || normalized === "suggested" ? "warning" : normalized === "ignored" ? "secondary" : "outline";
  return <Badge variant={variant} className="capitalize">{normalized.replaceAll("_", " ")}</Badge>;
}
