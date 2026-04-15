"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { useOrgHealthDetail } from "@/features/observability/hooks";
import { useOrganization } from "@/providers/organization-provider";
import { recordObservabilityEvent } from "@/lib/observability/telemetry";

export default function AdminOrgDetailPage() {
  const params = useParams<{ orgId: string }>();
  const { currentOrganizationId } = useOrganization();
  const q = useOrgHealthDetail(currentOrganizationId ?? undefined, params.orgId);

  useEffect(() => {
    if (!currentOrganizationId) return;
    void recordObservabilityEvent(currentOrganizationId, "admin.org_detail.viewed", "dashboard");
  }, [currentOrganizationId]);

  if (!q.data) return <p className="text-sm text-muted-foreground">Loading org detail…</p>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title={`Org ${params.orgId.slice(0, 8)} Health`} description="Single-org support/debug intelligence view." />
      <div className="grid gap-3 md:grid-cols-3 text-sm">
        <div className="rounded border p-3"><p className="text-muted-foreground">Overall</p><p className="font-semibold">{q.data.overall_status}</p></div>
        <div className="rounded border p-3"><p className="text-muted-foreground">Billing</p><p className="font-semibold">{q.data.billing_status}</p><p className="text-xs text-muted-foreground">{q.data.commercial_summary.plan_code ?? "no plan"} · {q.data.commercial_summary.billing_interval ?? "n/a"}</p></div>
        <div className="rounded border p-3"><p className="text-muted-foreground">Activation</p><p className="font-semibold">{q.data.activation_status}</p></div>
        <div className="rounded border p-3"><p className="text-muted-foreground">Errors(24h)</p><p className="font-semibold">{q.data.recent_error_summary.error_count_24h}</p></div>
        <div className="rounded border p-3"><p className="text-muted-foreground">Integration failures</p><p className="font-semibold">{q.data.integration_attention.failing_integrations_count}</p></div>
        <div className="rounded border p-3"><p className="text-muted-foreground">Unreconciled</p><p className="font-semibold">{q.data.reconciliation_attention.unreconciled_count ?? 0}</p><p className="text-xs text-muted-foreground">stale days: {q.data.reconciliation_attention.stale_days ?? "n/a"}</p></div>
        <div className="rounded border p-3"><p className="text-muted-foreground">Trust</p><p className="font-semibold">{q.data.trust_attention.status}</p></div>
        <div className="rounded border p-3"><p className="text-muted-foreground">Activity (7d)</p><p className="font-semibold">{q.data.activity_summary.audit_events_7d ?? 0}</p></div>
      </div>
    </div>
  );
}
