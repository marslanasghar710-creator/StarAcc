"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { BankImportDetailCard } from "@/features/banking/components/bank-import-detail-card";
import { BankTransactionListTable } from "@/features/banking/components/bank-transaction-list-table";
import { useBankImport, useBankImportTransactions } from "@/features/banking/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function BankImportDetailPage() {
  const params = useParams<{ importId: string }>();
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("bank_imports.read");
  const importQuery = useBankImport(currentOrganizationId ?? undefined, params.importId, canRead);
  const transactionsQuery = useBankImportTransactions(currentOrganizationId ?? undefined, params.importId, canRead);

  if (isLoadingOrganizations) return <LoadingScreen label="Loading import" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening import details." />;
  if (!canRead) return <AccessDeniedState description="You need bank_imports.read to view import details." />;
  if (importQuery.isLoading || transactionsQuery.isLoading) return <LoadingScreen label="Loading import details" />;
  if (importQuery.isError || transactionsQuery.isError) return <ErrorState description="We couldn't load this import run." onRetry={() => { void importQuery.refetch(); void transactionsQuery.refetch(); }} />;
  if (!importQuery.data) return <EmptyState title="Import not found" description="The requested import could not be found or this backend does not expose import detail yet." />;

  const bankImport = importQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Banking" title={bankImport.fileName || bankImport.id} description="Inspect import run metadata and the transactions created from the uploaded statement." actions={bankImport.bankAccountId ? <Link href={`/banking/accounts/${bankImport.bankAccountId}`} className="text-sm text-primary underline-offset-4 hover:underline">Open bank account</Link> : null} />
      <BankImportDetailCard bankImport={bankImport} />
      {(transactionsQuery.data?.length ?? 0) > 0 ? <BankTransactionListTable transactions={transactionsQuery.data ?? []} /> : <EmptyState title="No imported transactions" description="This import run did not return any transaction rows." />}
    </div>
  );
}
