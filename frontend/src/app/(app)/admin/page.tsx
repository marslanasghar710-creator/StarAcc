"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { AdminKpiStrip } from "@/components/admin/AdminKpiStrip";
import { HealthDomainCard } from "@/components/admin/HealthDomainCard";
import { ErrorFeed } from "@/components/admin/ErrorFeed";
import { AttentionQueuePanel } from "@/components/admin/AttentionQueuePanel";
import { SlowOperationsTable } from "@/components/admin/SlowOperationsTable";
import { useAdminOverview } from "@/features/observability/hooks";
import { useOrganization } from "@/providers/organization-provider";
import { recordObservabilityEvent } from "@/lib/observability/telemetry";

export default function AdminOverviewPage() {
  const { currentOrganizationId } = useOrganization();
  const overview = useAdminOverview(currentOrganizationId ?? undefined);

  useEffect(() => {
    if (!currentOrganizationId) return;
    void recordObservabilityEvent(currentOrganizationId, "admin.overview.viewed", "dashboard");
  }, [currentOrganizationId]);

  if (!currentOrganizationId) return <p className="text-sm text-muted-foreground">Select an organization.</p>;
  if (overview.isLoading || !overview.data) return <p className="text-sm text-muted-foreground">Loading admin overview…</p>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Observability Console" description="Internal operational visibility and action queues." />
      <AdminKpiStrip overview={overview.data} />
      <HealthDomainCard summary={overview.data.platform_health} />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-2"><h2 className="font-semibold">Attention queue</h2><AttentionQueuePanel items={overview.data.attention_queue} /></div>
        <div className="space-y-2"><h2 className="font-semibold">Recent errors</h2><ErrorFeed items={overview.data.recent_errors} /></div>
      </div>
      <div className="space-y-2"><h2 className="font-semibold">Slow operations</h2><SlowOperationsTable items={overview.data.top_slow_operations} /></div>
    </div>
  );
}
