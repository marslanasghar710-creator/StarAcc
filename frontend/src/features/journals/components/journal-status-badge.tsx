import { Badge } from "@/components/ui/badge";
import type { JournalStatus } from "@/features/journals/types";

export function JournalStatusBadge({ status }: { status: JournalStatus }) {
  const variant = status === "posted" ? "success" : status === "draft" ? "secondary" : status === "reversed" ? "warning" : "danger";
  return <Badge variant={variant} className="capitalize">{status}</Badge>;
}
