"use client";

import { useMemo, useState } from "react";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runConsolidationSchema } from "@/features/consolidation/schemas";
import type { GroupEntity } from "@/features/consolidation/types";

export function ConsolidationRunPanel({
  entities,
  reportingCurrency,
  onRun,
  isSubmitting = false,
}: {
  entities: GroupEntity[];
  reportingCurrency: string;
  onRun: (payload: { period_start: string; period_end: string; fx_rates: Array<{ organization_id: string; rate: string }> }) => Promise<void> | void;
  isSubmitting?: boolean;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [periodStart, setPeriodStart] = useState(today.slice(0, 8) + "01");
  const [periodEnd, setPeriodEnd] = useState(today);
  const [fxRates, setFxRates] = useState<Record<string, string>>({});
  const validation = runConsolidationSchema.safeParse({ period_start: periodStart, period_end: periodEnd });
  const crossCurrencyEntities = entities.filter((entity) => entity.organization_currency !== reportingCurrency);

  return (
    <SectionCard title="Run consolidation" description="Backend-driven consolidation combines group entities, applies eliminations, and produces financial statements.">
      <div className="grid gap-4 lg:grid-cols-3">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Period start</span>
          <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Period end</span>
          <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
        </label>
        <div className="space-y-2 text-sm">
          <span className="font-medium">Reporting currency</span>
          <div className="rounded-md border bg-muted/30 px-3 py-2">{reportingCurrency}</div>
        </div>
      </div>

      {crossCurrencyEntities.length ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {crossCurrencyEntities.map((entity) => (
            <label key={entity.id} className="space-y-2 text-sm">
              <span className="font-medium">FX rate for {entity.organization_name} ({entity.organization_currency} → {reportingCurrency})</span>
              <Input
                placeholder="e.g. 1.25"
                value={fxRates[entity.organization_id] || ""}
                onChange={(event) => setFxRates((current) => ({ ...current, [entity.organization_id]: event.target.value }))}
              />
            </label>
          ))}
        </div>
      ) : null}

      {!validation.success ? <InlineValidationMessage message={validation.error.issues[0]?.message ?? "Invalid date range"} /> : null}

      <div className="mt-4 flex justify-end">
        <Button
          onClick={() => onRun({
            period_start: periodStart,
            period_end: periodEnd,
            fx_rates: Object.entries(fxRates).filter(([, rate]) => rate).map(([organization_id, rate]) => ({ organization_id, rate })),
          })}
          disabled={!validation.success || isSubmitting}
        >
          {isSubmitting ? "Running…" : "Run consolidation"}
        </Button>
      </div>
    </SectionCard>
  );
}
