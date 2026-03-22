import { Badge } from "@/components/ui/badge";
import type { FiscalPeriodStatus } from "@/features/settings/types";

const STATUS_MAP: Record<FiscalPeriodStatus, { label: string; variant: "success" | "warning" | "secondary" }> = {
  open: { label: "Open", variant: "success" },
  closed: { label: "Closed", variant: "warning" },
  locked: { label: "Locked", variant: "secondary" },
};

export function FiscalPeriodStatusBadge({ status }: { status: FiscalPeriodStatus }) {
  const config = STATUS_MAP[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
