import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getPeriodStatusTone } from "@/lib/accounting/periods";
import { cn } from "@/lib/utils";
import type { Period } from "@/features/periods/types";

function IconForStatus({ status }: { status: Period["status"] }) {
  if (status === "open") return <CheckCircle2 className="size-4" />;
  if (status === "locked") return <Lock className="size-4" />;
  return <AlertTriangle className="size-4" />;
}

export function PeriodStatusBanner({ period, compact = false }: { period: Period | null; compact?: boolean }) {
  if (!period) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        No financial period resolved for the selected journal date.
      </div>
    );
  }

  const tone = getPeriodStatusTone(period.status);
  const containerTone = tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100" : tone === "warning" ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100" : "border-destructive/30 bg-destructive/10 text-foreground";

  return (
    <div className={cn("rounded-lg border px-4 py-3", containerTone)}>
      <div className={cn("flex gap-3", compact ? "items-center" : "items-start")}>
        <IconForStatus status={period.status} />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{period.name}</p>
            <Badge variant={tone} className="capitalize">{period.status}</Badge>
          </div>
          <p className="text-sm opacity-90">{period.startDate} to {period.endDate}</p>
          {period.status !== "open" ? <p className="text-sm opacity-90">This period is not open. Draft edits or posting may be blocked by backend validation.</p> : null}
        </div>
      </div>
    </div>
  );
}
