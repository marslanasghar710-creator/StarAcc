"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { useGroups, useConsolidationRuns, useRunConsolidation, useGroupEntities } from "@/features/consolidation/hooks";
import { ConsolidatedReportTable } from "@/features/consolidation/components/consolidated-report-table";
import { ConsolidationRunPanel } from "@/features/consolidation/components/consolidation-run-panel";
import { ConsolidationStatusCard } from "@/features/consolidation/components/consolidation-status-card";
import { GroupSelector } from "@/features/consolidation/components/group-selector";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function ConsolidationDashboardPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("consolidation.read");
  const groupsQuery = useGroups(currentOrganizationId ?? undefined);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const entitiesQuery = useGroupEntities(selectedGroupId);
  const runsQuery = useConsolidationRuns(selectedGroupId);
  const runMutation = useRunConsolidation(selectedGroupId);

  useEffect(() => {
    if (!selectedGroupId && groupsQuery.data?.length) {
      setSelectedGroupId(groupsQuery.data[0]?.id);
    }
  }, [groupsQuery.data, selectedGroupId]);

  const latestRun = useMemo(() => runsQuery.data?.[0] ?? null, [runsQuery.data]);

  if (isLoadingOrganizations) return <LoadingScreen label="Loading consolidation" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening consolidation." />;
  if (!canRead) return <AccessDeniedState description="You need consolidation.read to access multi-entity reporting." />;
  if (groupsQuery.isLoading) return <LoadingScreen label="Loading consolidation groups" />;
  if (groupsQuery.isError) return <ErrorState title="Groups unavailable" description="We couldn't load consolidation groups." onRetry={() => void groupsQuery.refetch()} />;

  const groups = groupsQuery.data ?? [];
  if (!groups.length) {
    return <EmptyState title="No consolidation groups yet" description="Create a group to start multi-entity reporting." action={<Button asChild><Link href="/consolidation/groups">Manage groups</Link></Button>} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Consolidation"}
        title="Consolidation dashboard"
        description="Run backend-driven consolidations, review elimination activity, and inspect group-level financial statements."
        actions={<Button asChild variant="outline"><Link href="/consolidation/groups">Manage groups</Link></Button>}
      />

      <SectionCard title="Group selector" description="Choose which group to review.">
        <GroupSelector groups={groups} value={selectedGroupId} onChange={setSelectedGroupId} />
      </SectionCard>

      <ConsolidationStatusCard run={latestRun} />

      {selectedGroupId ? (
        <ConsolidationRunPanel
          entities={entitiesQuery.data ?? []}
          reportingCurrency={groups.find((group) => group.id === selectedGroupId)?.reporting_currency ?? "USD"}
          isSubmitting={runMutation.isPending}
          onRun={async (payload) => {
            await runMutation.mutateAsync(payload);
            await runsQuery.refetch();
          }}
        />
      ) : null}

      {latestRun?.income_statement ? <ConsolidatedReportTable title="Income statement" lines={latestRun.income_statement.revenue.lines.concat(latestRun.income_statement.expenses.lines)} /> : null}
      {latestRun?.trial_balance ? <ConsolidatedReportTable title="Trial balance" lines={latestRun.trial_balance.lines} amountLabel="Balance" /> : null}
    </div>
  );
}
