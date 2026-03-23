"use client";

import { useParams } from "next/navigation";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EliminationEntryDialog } from "@/features/consolidation/components/elimination-entry-dialog";
import { EliminationEntryTable } from "@/features/consolidation/components/elimination-entry-table";
import { GroupEntityManager } from "@/features/consolidation/components/group-entity-manager";
import { ConsolidationRunPanel } from "@/features/consolidation/components/consolidation-run-panel";
import { ConsolidationStatusCard } from "@/features/consolidation/components/consolidation-status-card";
import { useAddGroupEntity, useConsolidationRuns, useCreateElimination, useGroup, useGroupEntities, useEliminations, useRemoveGroupEntity, useRunConsolidation } from "@/features/consolidation/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function ConsolidationGroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const { currentOrganizationId, currentOrganization, organizations } = useOrganization();
  const groupQuery = useGroup(currentOrganizationId ?? undefined, groupId);
  const entitiesQuery = useGroupEntities(groupId);
  const runsQuery = useConsolidationRuns(groupId);
  const eliminationsQuery = useEliminations(groupId);
  const addEntityMutation = useAddGroupEntity(groupId);
  const removeEntityMutation = useRemoveGroupEntity(groupId);
  const runMutation = useRunConsolidation(groupId);
  const eliminationMutation = useCreateElimination(groupId);

  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization first." />;
  if (groupQuery.isLoading || entitiesQuery.isLoading || runsQuery.isLoading || eliminationsQuery.isLoading) return <LoadingScreen label="Loading group" />;
  if (groupQuery.isError) return <ErrorState title="Group unavailable" description="Unable to load this consolidation group." onRetry={() => void groupQuery.refetch()} />;
  if (!groupQuery.data) return <EmptyState title="Group not found" description="The requested group could not be found." />;

  const latestRun = runsQuery.data?.[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Consolidation"} title={groupQuery.data.name} description={groupQuery.data.description || "Backend-driven consolidation scope and reporting workspace."} />
      <SectionCard title="Entities" description="Manage which organizations are included in this consolidation group.">
        <GroupEntityManager
          entities={entitiesQuery.data ?? []}
          organizations={organizations}
          onAdd={async (organizationId) => {
            await addEntityMutation.mutateAsync({ organization_id: organizationId });
            await entitiesQuery.refetch();
          }}
          onRemove={async (entityId) => {
            await removeEntityMutation.mutateAsync(entityId);
            await entitiesQuery.refetch();
          }}
        />
      </SectionCard>
      <ConsolidationStatusCard run={latestRun} />
      <ConsolidationRunPanel
        entities={entitiesQuery.data ?? []}
        reportingCurrency={groupQuery.data.reporting_currency}
        isSubmitting={runMutation.isPending}
        onRun={async (payload) => {
          await runMutation.mutateAsync(payload);
          await runsQuery.refetch();
        }}
      />
      <SectionCard title="Elimination entries" description="Automatic eliminations are created during runs. Manual journals stay backend-governed and auditable." actions={<EliminationEntryDialog entities={entitiesQuery.data ?? []} onCreate={async (payload) => { await eliminationMutation.mutateAsync(payload); await eliminationsQuery.refetch(); }} />}>
        <EliminationEntryTable entries={eliminationsQuery.data ?? []} />
      </SectionCard>
    </div>
  );
}
