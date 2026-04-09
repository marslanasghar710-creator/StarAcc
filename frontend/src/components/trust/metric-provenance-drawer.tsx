"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMetricProvenance } from "@/features/trust/hooks";
import { trackEvent } from "@/features/funnel/analytics";

export function MetricProvenanceDrawer({ organizationId, metricId, triggerLabel = "Why this number?" }: { organizationId?: string; metricId: string; triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const query = useMetricProvenance(organizationId, open ? metricId : undefined);

  useEffect(() => {
    if (!open || !organizationId) return;
    void trackEvent("trust.metric_provenance.viewed", { metric_id: metricId }, { page_type: "app", surface: "authenticated_app", funnel_domain: "activation", funnel_stage: "activated", org_id: organizationId, is_authenticated: true });
  }, [open, organizationId, metricId]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">{triggerLabel}</Button>
      </SheetTrigger>
      <SheetContent className="w-[460px] sm:max-w-[460px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Metric provenance</SheetTitle>
        </SheetHeader>
        {query.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading provenance…</p> : null}
        {query.data ? (
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="font-medium">{query.data.label}</p>
              <p className="text-muted-foreground">Source type: {query.data.value_basis.source_type}</p>
            </div>
            <div>
              <p className="font-medium">Underlying counts</p>
              <ul className="mt-1 text-muted-foreground">
                {Object.entries(query.data.underlying_counts).map(([k, v]) => <li key={k}>• {k}: {v}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-medium">Drill-through</p>
              <ul className="mt-1 text-muted-foreground">
                {query.data.drill_targets.map((target) => <li key={`${target.target_type}-${target.route}`}>• {target.label} → {target.route}</li>)}
              </ul>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
