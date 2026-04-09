"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ErrorFeed } from "@/components/admin/ErrorFeed";
import { useAdminErrors } from "@/features/observability/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function AdminErrorsPage() {
  const { currentOrganizationId } = useOrganization();
  const q = useAdminErrors(currentOrganizationId ?? undefined);
  return <div className="space-y-6"><PageHeader eyebrow="Admin" title="Error Feed" description="Classified failures for support and reliability workflows." />{q.data ? <ErrorFeed items={q.data} /> : <p className="text-sm text-muted-foreground">Loading errors…</p>}</div>;
}
