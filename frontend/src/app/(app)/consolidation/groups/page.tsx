"use client";

import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupListTable } from "@/features/consolidation/components/group-list-table";
import { useCreateGroup, useGroups } from "@/features/consolidation/hooks";
import { createGroupSchema } from "@/features/consolidation/schemas";
import { useOrganization } from "@/providers/organization-provider";

export default function ConsolidationGroupsPage() {
  const { currentOrganizationId, currentOrganization } = useOrganization();
  const groupsQuery = useGroups(currentOrganizationId ?? undefined);
  const createMutation = useCreateGroup(currentOrganizationId ?? undefined);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(currentOrganization?.base_currency ?? "USD");
  const [description, setDescription] = useState("");
  const validation = createGroupSchema.safeParse({ name, reporting_currency: currency, description });

  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization first." />;
  if (groupsQuery.isLoading) return <LoadingScreen label="Loading groups" />;
  if (groupsQuery.isError) return <ErrorState title="Groups unavailable" description="Unable to load consolidation groups." onRetry={() => void groupsQuery.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Consolidation"} title="Consolidation groups" description="Create and manage entity groupings used for consolidated financial reporting." />
      <SectionCard title="Create group" description="Groups define the reporting currency and the set of entities included in consolidation runs.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Input placeholder="Group name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input placeholder="Currency" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
          <Input placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        {!validation.success ? <InlineValidationMessage message={validation.error.issues[0]?.message ?? "Invalid group"} /> : null}
        <div className="mt-4 flex justify-end">
          <Button disabled={!validation.success || createMutation.isPending} onClick={async () => {
            await createMutation.mutateAsync({ name, reporting_currency: currency, description });
            setName("");
            setDescription("");
            await groupsQuery.refetch();
          }}>Create group</Button>
        </div>
      </SectionCard>
      <SectionCard title="Existing groups">
        {groupsQuery.data?.length ? <GroupListTable groups={groupsQuery.data} /> : <EmptyState title="No groups yet" description="Create a group to start consolidating entities." />}
      </SectionCard>
    </div>
  );
}
