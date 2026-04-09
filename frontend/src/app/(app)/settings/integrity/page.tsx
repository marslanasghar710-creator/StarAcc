"use client";

import Link from "next/link";
import { useEffect } from "react";

import { MetricProvenanceDrawer } from "@/components/trust/metric-provenance-drawer";
import { TrustStatusCard } from "@/components/trust/trust-status-card";
import { Button } from "@/components/ui/button";
import { useIntegrityCenter } from "@/features/trust/hooks";
import { trackEvent } from "@/features/funnel/analytics";
import { useOrganization } from "@/providers/organization-provider";

export default function IntegrityCenterPage() {
  const { currentOrganizationId } = useOrganization();
  const query = useIntegrityCenter(currentOrganizationId ?? undefined);

  useEffect(() => {
    if (!currentOrganizationId) return;
    void trackEvent("trust.summary.viewed", { source: "integrity_center" }, { page_type: "app", surface: "authenticated_app", funnel_domain: "activation", funnel_stage: "activated", org_id: currentOrganizationId, is_authenticated: true });
  }, [currentOrganizationId]);

  if (!currentOrganizationId) {
    return <p className="text-sm text-muted-foreground">Select an organization to view trust and integrity status.</p>;
  }

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading integrity center…</p>;
  }

  if (!query.data) {
    return <p className="text-sm text-muted-foreground">Integrity center data unavailable.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Integrity center</h1>
          <p className="text-sm text-muted-foreground">Operational trust summary, ledger integrity checks, and reconciliation confidence.</p>
        </div>
        <Button asChild variant="outline"><Link href="/activity">View audit activity</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {query.data.trust_summary.domains.map((domain) => <TrustStatusCard key={domain.domain} domain={domain} />)}
      </div>

      <section className="rounded-xl border border-border/70 bg-card p-4">
        <h2 className="text-lg font-semibold">Ledger integrity evidence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Checked journals: {query.data.ledger_integrity.evidence.checked_journal_count} • Issues found: {query.data.ledger_integrity.evidence.issues_found}
        </p>
      </section>

      <section className="rounded-xl border border-border/70 bg-card p-4">
        <h2 className="text-lg font-semibold">Reconciliation confidence</h2>
        <div className="mt-2 space-y-2 text-sm">
          {query.data.reconciliation_status.map((item) => (
            <p key={item.bank_account_id ?? "org"} onClick={() => { if (item.status !== "healthy") { void trackEvent("trust.reconciliation_attention.clicked", { bank_account_id: item.bank_account_id ?? null, status: item.status }, { page_type: "app", surface: "authenticated_app", funnel_domain: "activation", funnel_stage: "activated", org_id: currentOrganizationId, is_authenticated: true }); } }}>
              {item.bank_account_id ? `Account ${item.bank_account_id.slice(0, 8)}…` : "Organization"}: {item.unreconciled_transaction_count} unreconciled • last reconciled {item.last_reconciled_at ?? "never"}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-card p-4">
        <h2 className="text-lg font-semibold">Number provenance</h2>
        <div className="mt-3 flex gap-2">
          <MetricProvenanceDrawer organizationId={currentOrganizationId} metricId="cash_position_summary" />
          <MetricProvenanceDrawer organizationId={currentOrganizationId} metricId="receivables_outstanding_summary" />
        </div>
      </section>
    </div>
  );
}
