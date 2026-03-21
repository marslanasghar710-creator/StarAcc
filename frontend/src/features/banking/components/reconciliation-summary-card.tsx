import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { DateDisplay } from "@/components/shared/date-display";
import type { ReconciliationSummary } from "@/features/banking/types";

export function ReconciliationSummaryCard({ summary }: { summary?: ReconciliationSummary | null }) {
  return (
    <EntitySummaryCard
      title="Reconciliation summary"
      description="High-level banking queue indicators returned by the backend."
      rows={[
        { label: "Unreconciled", value: summary?.unreconciledCount ?? "—" },
        { label: "Reconciled", value: summary?.reconciledCount ?? "—" },
        { label: "Ignored", value: summary?.ignoredCount ?? "—" },
        { label: "Latest import", value: <DateDisplay value={summary?.latestImportedAt} includeTime /> },
      ]}
    />
  );
}
