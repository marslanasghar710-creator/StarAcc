"use client";

import { AttentionQueuePanel } from "@/components/admin/AttentionQueuePanel";
import { JobStatusTable } from "@/components/admin/JobStatusTable";
import { PageHeader } from "@/components/layout/page-header";
import { useAdminJobs, useAttentionQueue } from "@/features/observability/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function AdminIntegrationsPage() {
  const { currentOrganizationId } = useOrganization();
  const queue = useAttentionQueue(currentOrganizationId ?? undefined);
  const jobs = useAdminJobs(currentOrganizationId ?? undefined);

  const integrationItems = (queue.data ?? []).filter((item) => item.type === "integration_failure");
  const integrationJobs = (jobs.data ?? []).filter((item) => item.job_type.startsWith("integration_sync:"));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Integrations observability" description="Integration reliability watchlist, failures, and recent sync executions." />

      <section className="space-y-2">
        <h2 className="font-semibold">Integration attention queue</h2>
        {queue.data ? <AttentionQueuePanel items={integrationItems} /> : <p className="text-sm text-muted-foreground">Loading integration queue…</p>}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Recent integration sync jobs</h2>
        {jobs.data ? (
          integrationJobs.length ? <JobStatusTable items={integrationJobs} /> : <p className="text-sm text-muted-foreground">No integration jobs found for this organization.</p>
        ) : <p className="text-sm text-muted-foreground">Loading integration jobs…</p>}
      </section>
    </div>
  );
}
