"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Activity, RefreshCcw, X } from "lucide-react";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityFacetCard } from "@/features/activity/components/activity-facet-card";
import { ActivityLogTable } from "@/features/activity/components/activity-log-table";
import { ActivitySummaryCards } from "@/features/activity/components/activity-summary-cards";
import { useActivityCenter } from "@/features/activity/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { useCommandActions, useShortcuts } from "@/features/productivity/shortcuts/use-shortcuts";
import { useOrganization } from "@/providers/organization-provider";

const DEFAULT_LIMIT = 100;

export default function ActivityPage() {
  const router = useRouter();
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canReadAudit = can("org.read");
  const [search, setSearch] = React.useState("");
  const [action, setAction] = React.useState("all");
  const [entityType, setEntityType] = React.useState("all");
  const [actorEmail, setActorEmail] = React.useState("");
  const [entityId, setEntityId] = React.useState("");

  useShortcuts([{ id: "activity.focus-search", combo: "/", description: "Focus activity search", route: "/activity", allowInInput: false, handler: () => document.getElementById("activity-search")?.focus() }, { id: "activity.refresh", combo: "r", description: "Refresh activity", route: "/activity", handler: () => void activityQuery.refetch() }]);

  useCommandActions([{ id: "activity.open", title: "Open activity center", group: "Audit", perform: () => router.push("/activity") }]);

  const filters = React.useMemo(() => ({
    q: search || undefined,
    action: action !== "all" ? action : undefined,
    entityType: entityType !== "all" ? entityType : undefined,
    actorEmail: actorEmail || undefined,
    entityId: entityId || undefined,
    limit: DEFAULT_LIMIT,
  }), [action, actorEmail, entityId, entityType, search]);

  const activityQuery = useActivityCenter(currentOrganizationId ?? undefined, filters, canReadAudit);

  function clearFilters() {
    setSearch("");
    setAction("all");
    setEntityType("all");
    setActorEmail("");
    setEntityId("");
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading activity center" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening the activity center." />;
  }

  if (!canReadAudit) {
    return <AccessDeniedState description="You need organization read access to review centralized audit activity." />;
  }

  const summary = activityQuery.data;
  const topActions = summary?.topActions ?? [];
  const topEntityTypes = summary?.topEntityTypes ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Activity"}
        title="Activity center"
        description="Query centralized audit activity without making the frontend authoritative for security, workflow, or accounting truth."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void activityQuery.refetch()}><RefreshCcw className="size-4" />Refresh</Button>
            <Button variant="outline" onClick={clearFilters}><X className="size-4" />Clear filters</Button>
          </div>
        }
      />

      {summary ? <ActivitySummaryCards summary={summary} /> : null}

      <PageActionBar
        left={
          <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input id="activity-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action, entity, metadata, or actor" />
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {topActions.map((item) => <SelectItem key={item.value ?? "unknown"} value={item.value ?? "unknown"}>{item.value ?? "Unknown"}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger><SelectValue placeholder="All entity types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entity types</SelectItem>
                {topEntityTypes.map((item) => <SelectItem key={item.value ?? "unknown"} value={item.value ?? "unknown"}>{item.value ?? "Unknown"}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={actorEmail} onChange={(event) => setActorEmail(event.target.value)} placeholder="Filter by actor email" />
            <Input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="Filter by entity id" />
          </div>
        }
        right={<p className="text-sm text-muted-foreground">Backend limit {summary?.appliedLimit ?? DEFAULT_LIMIT}{summary?.hasMore ? " · additional rows available" : ""}</p>}
      />

      {activityQuery.isLoading ? <LoadingScreen label="Loading activity" /> : null}
      {activityQuery.isError ? <ErrorState description="We couldn't load centralized audit activity." onRetry={() => void activityQuery.refetch()} /> : null}
      {!activityQuery.isLoading && !activityQuery.isError && summary && summary.items.length === 0 ? <EmptyState title="No audit activity matched" description="Try broader filters or refresh after new backend events are recorded." action={<Button variant="outline" onClick={clearFilters}><Activity className="size-4" />Reset filters</Button>} /> : null}

      {summary ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <ActivityLogTable items={summary.items} />
          </div>
          <div className="space-y-4">
            <ActivityFacetCard title="Top actions" description="Most common audit action codes in the current filter set." items={summary.topActions} />
            <ActivityFacetCard title="Top entity types" description="Which record families are generating the most activity right now." items={summary.topEntityTypes} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
