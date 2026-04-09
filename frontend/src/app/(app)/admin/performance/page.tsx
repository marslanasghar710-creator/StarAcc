"use client";

import { PageHeader } from "@/components/layout/page-header";
import { SlowOperationsTable } from "@/components/admin/SlowOperationsTable";
import { useAdminPerformance } from "@/features/observability/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function AdminPerformancePage() {
  const { currentOrganizationId } = useOrganization();
  const q = useAdminPerformance(currentOrganizationId ?? undefined);
  return <div className="space-y-6"><PageHeader eyebrow="Admin" title="Performance" description="Latency and throughput signals for critical paths." />{q.data ? <SlowOperationsTable items={q.data} /> : <p className="text-sm text-muted-foreground">Loading performance metrics…</p>}</div>;
}
