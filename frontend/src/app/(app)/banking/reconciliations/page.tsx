"use client";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateDisplay } from "@/components/shared/date-display";
import { useReconciliations } from "@/features/banking/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function ReconciliationsPage() {
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { hasAnyPermission } = usePermissions();
  const canRead = hasAnyPermission(["reconciliation.read", "bank_reconciliation.read"]);
  const reconciliationsQuery = useReconciliations(currentOrganizationId ?? undefined, canRead);

  if (isLoadingOrganizations) return <LoadingScreen label="Loading reconciliations" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening reconciliations." />;
  if (!canRead) return <AccessDeniedState description="You need reconciliation.read to view reconciliation history." />;
  if (reconciliationsQuery.isLoading) return <LoadingScreen label="Loading reconciliations" />;
  if (reconciliationsQuery.isError) return <ErrorState description="We couldn't load reconciliation history." onRetry={() => void reconciliationsQuery.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Banking" title="Reconciliations" description="Review reconciliation history and backend-created links for bank transaction actions." />
      {(reconciliationsQuery.data?.length ?? 0) > 0 ? <div className="rounded-xl border border-border/70 bg-card shadow-xs"><Table><TableHeader><TableRow><TableHead>Reconciliation</TableHead><TableHead>Transaction</TableHead><TableHead>Action</TableHead><TableHead>Matched entity</TableHead><TableHead>Journal</TableHead><TableHead>Created</TableHead></TableRow></TableHeader><TableBody>{(reconciliationsQuery.data ?? []).map((item) => <TableRow key={item.id}><TableCell>{item.id}</TableCell><TableCell>{item.bankTransactionDescription || item.bankTransactionId}</TableCell><TableCell>{item.actionType || "—"}</TableCell><TableCell>{item.matchedEntityType && item.matchedEntityId ? `${item.matchedEntityType} · ${item.matchedEntityId}` : "—"}</TableCell><TableCell>{item.createdJournalId || "—"}</TableCell><TableCell><DateDisplay value={item.createdAt} includeTime /></TableCell></TableRow>)}</TableBody></Table></div> : <EmptyState title="No reconciliations yet" description="Reconciliation history will appear here once transactions are matched, cash coded, or transferred." />}
    </div>
  );
}
