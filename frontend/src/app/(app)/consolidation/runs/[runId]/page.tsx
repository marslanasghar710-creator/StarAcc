"use client";

import { useParams, useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { ConsolidatedReportTable } from "@/features/consolidation/components/consolidated-report-table";
import { useConsolidationRun } from "@/features/consolidation/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function ConsolidationRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;
  const { currentOrganizationId, currentOrganization } = useOrganization();
  const runQuery = useConsolidationRun(groupId, runId);

  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization first." />;
  if (!groupId) return <EmptyState title="Missing group context" description="Open this run from a consolidation group or dashboard so the group identifier is available." />;
  if (runQuery.isLoading) return <LoadingScreen label="Loading consolidation run" />;
  if (runQuery.isError) return <ErrorState title="Run unavailable" description="Unable to load the requested consolidation run." onRetry={() => void runQuery.refetch()} />;
  if (!runQuery.data) return <EmptyState title="Run not found" description="No consolidation run matched this identifier." />;

  const run = runQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Consolidation"} title="Consolidation run" description={`${run.period_start} to ${run.period_end} · ${run.status}`} />
      <SectionCard title="Run summary">
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>Elimination count: {run.elimination_summary?.count ?? 0}</div>
          <div>Completed: {run.completed_at ? new Date(run.completed_at).toLocaleString() : "In progress"}</div>
        </div>
      </SectionCard>
      {run.income_statement ? <ConsolidatedReportTable title="Income statement" lines={run.income_statement.revenue.lines.concat(run.income_statement.expenses.lines)} /> : null}
      {run.balance_sheet ? <ConsolidatedReportTable title="Balance sheet" lines={run.balance_sheet.assets.lines.concat(run.balance_sheet.liabilities.lines, run.balance_sheet.equity.lines)} /> : null}
      {run.trial_balance ? <ConsolidatedReportTable title="Trial balance" lines={run.trial_balance.lines} amountLabel="Balance" /> : null}
    </div>
  );
}
