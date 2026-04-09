"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AttentionQueuePanel } from "@/components/admin/AttentionQueuePanel";
import { useAttentionQueue } from "@/features/observability/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function AdminIntegrationsPage() {
  const { currentOrganizationId } = useOrganization();
  const q = useAttentionQueue(currentOrganizationId ?? undefined);
  const integrationItems = (q.data ?? []).filter((item) => item.type === "integration_failure");
  return <div className="space-y-6"><PageHeader eyebrow="Admin" title="Integration Attention" description="Integration reliability watchlist and issue queue." />{q.data ? <AttentionQueuePanel items={integrationItems} /> : <p className="text-sm text-muted-foreground">Loading integration queue…</p>}</div>;
}
