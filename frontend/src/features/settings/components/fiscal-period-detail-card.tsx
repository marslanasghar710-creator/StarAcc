import { DateDisplay } from "@/components/shared/date-display";
import { FiscalPeriodStatusBadge } from "@/features/settings/components/fiscal-period-status-badge";
import type { FiscalPeriodRecord } from "@/features/settings/types";

export function FiscalPeriodDetailCard({ period }: { period: FiscalPeriodRecord }) {
  return (
    <div className="grid gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-5">
      <div>
        <p className="text-sm text-muted-foreground">Current focus</p>
        <p className="font-medium">{period.name}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Period range</p>
        <p>
          <DateDisplay value={period.startDate} /> — <DateDisplay value={period.endDate} />
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Status</p>
        <FiscalPeriodStatusBadge status={period.status} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Period number</p>
        <p>{period.periodNumber ?? "—"}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Closed at</p>
        <DateDisplay value={period.closedAt} includeTime />
      </div>
    </div>
  );
}
