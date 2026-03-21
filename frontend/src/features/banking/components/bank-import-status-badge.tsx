import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";

export function BankImportStatusBadge({ status }: { status: string }) {
  const normalized = status || "processing";
  const variant: BadgeProps["variant"] = normalized === "completed" ? "success" : normalized === "failed" ? "danger" : normalized === "partially_completed" ? "warning" : "secondary";
  return <Badge variant={variant} className="capitalize">{normalized.replaceAll("_", " ")}</Badge>;
}
