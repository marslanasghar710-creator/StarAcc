"use client";

import { PageHeader } from "@/components/layout/page-header";
import { OrgHealthTable } from "@/components/admin/OrgHealthTable";
import { useOrgHealthList } from "@/features/observability/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function AdminOrgsPage() {
  const { currentOrganizationId } = useOrganization();
  const health = useOrgHealthList(currentOrganizationId ?? undefined);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Organization Health" description="Support-ready health snapshots for organizations." />
      {health.data ? <OrgHealthTable items={health.data} /> : <p className="text-sm text-muted-foreground">Loading org health…</p>}
    </div>
  );
}
