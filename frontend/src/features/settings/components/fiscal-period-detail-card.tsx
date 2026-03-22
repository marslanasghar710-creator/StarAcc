import * as React from "react";

import { DateDisplay } from "@/components/shared/date-display";
import { Badge } from "@/components/ui/badge";
import type { FiscalPeriodRecord } from "@/features/settings/types";

export function FiscalPeriodDetailCard({ period }: { period: FiscalPeriodRecord }) {
  return (
    <div className="grid gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-4">
      <div>
        <p className="text-sm text-muted-foreground">Period</p>
        <p className="font-medium">{period.name}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Range</p>
        <p><DateDisplay value={period.startDate} /> — <DateDisplay value={period.endDate} /></p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Status</p>
        <Badge variant={period.status === "open" ? "success" : period.status === "closed" ? "warning" : "secondary"}>{period.status}</Badge>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Closed at</p>
        <DateDisplay value={period.closedAt} includeTime />
      </div>
    </div>
  );
}
