"use client";

import { PageHeader } from "@/components/layout/page-header";
import { HealthDomainCard } from "@/components/admin/HealthDomainCard";
import { usePlatformHealth } from "@/features/observability/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function AdminHealthPage() {
  const { currentOrganizationId } = useOrganization();
  const q = usePlatformHealth(currentOrganizationId ?? undefined);
  return <div className="space-y-6"><PageHeader eyebrow="Admin" title="Platform Health" description="Domain-level health status derived from operational signals." />{q.data ? <HealthDomainCard summary={q.data} /> : <p className="text-sm text-muted-foreground">Loading health…</p>}</div>;
}
