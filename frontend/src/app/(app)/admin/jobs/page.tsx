"use client";

import { PageHeader } from "@/components/layout/page-header";
import { JobStatusTable } from "@/components/admin/JobStatusTable";
import { useAdminJobs } from "@/features/observability/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function AdminJobsPage() {
  const { currentOrganizationId } = useOrganization();
  const q = useAdminJobs(currentOrganizationId ?? undefined);
  return <div className="space-y-6"><PageHeader eyebrow="Admin" title="Job Observability" description="Queue, retry, and failure visibility for background processing." />{q.data ? <JobStatusTable items={q.data} /> : <p className="text-sm text-muted-foreground">Loading jobs…</p>}</div>;
}
