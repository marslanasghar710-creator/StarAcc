"use client";

import * as React from "react";
import { Landmark, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/features/accounts/hooks";
import { BankAccountFormDialog } from "@/features/banking/components/bank-account-form-dialog";
import { BankAccountListTable } from "@/features/banking/components/bank-account-list-table";
import { BankImportListTable } from "@/features/banking/components/bank-import-list-table";
import { BankImportUploadDialog } from "@/features/banking/components/bank-import-upload-dialog";
import { BankTransactionListTable } from "@/features/banking/components/bank-transaction-list-table";
import { CashbookSummaryCard } from "@/features/banking/components/cashbook-summary-card";
import { ReconciliationSummaryCard } from "@/features/banking/components/reconciliation-summary-card";
import { useBankAccounts, useBankImports, useCreateBankAccount, useCreateBankImport, useCashbook, useReconciliationSummary, useUnreconciledBankTransactions } from "@/features/banking/hooks";
import type { BankAccountFormValues, BankImportUploadValues } from "@/features/banking/schemas";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toBankAccountPayload(values: BankAccountFormValues) {
  return {
    name: values.name.trim(),
    display_name: values.display_name?.trim() || null,
    bank_name: values.bank_name?.trim() || null,
    account_number_masked: values.account_number_masked?.trim() || null,
    iban_masked: values.iban_masked?.trim() || null,
    currency_code: values.currency_code.trim().toUpperCase(),
    account_type: values.account_type?.trim() || null,
    gl_account_id: values.gl_account_id,
    opening_balance: values.opening_balance || "0",
    opening_balance_date: values.opening_balance_date || null,
    is_active: values.is_active,
    is_default_receipts_account: values.is_default_receipts_account,
    is_default_payments_account: values.is_default_payments_account,
  };
}

export default function BankingOverviewPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can, hasAnyPermission } = usePermissions();
  const canReadBankAccounts = can("bank_accounts.read");
  const canCreateBankAccounts = can("bank_accounts.create");
  const canReadTransactions = can("bank_transactions.read");
  const canReadReconciliation = hasAnyPermission(["reconciliation.read", "bank_reconciliation.read"]);
  const canCreateImports = can("bank_imports.create");
  const [isAccountOpen, setIsAccountOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);

  const bankAccountsQuery = useBankAccounts(currentOrganizationId ?? undefined, "", canReadBankAccounts);
  const unreconciledQuery = useUnreconciledBankTransactions(currentOrganizationId ?? undefined, canReadTransactions);
  const importsQuery = useBankImports(currentOrganizationId ?? undefined, can("bank_imports.read"));
  const cashbookQuery = useCashbook(currentOrganizationId ?? undefined, can("cashbook.read") || canReadReconciliation);
  const reconciliationSummaryQuery = useReconciliationSummary(currentOrganizationId ?? undefined, canReadReconciliation);
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", can("accounts.read"));
  const createBankAccountMutation = useCreateBankAccount(currentOrganizationId ?? undefined);
  const createImportMutation = useCreateBankImport(currentOrganizationId ?? undefined);

  const bankAccounts = bankAccountsQuery.data ?? [];

  async function handleCreateBankAccount(values: BankAccountFormValues) {
    const bankAccount = await createBankAccountMutation.mutateAsync(toBankAccountPayload(values));
    toast.success(`Created ${bankAccount.displayName || bankAccount.name}`);
  }

  async function handleCreateImport(values: BankImportUploadValues) {
    const bankImport = await createImportMutation.mutateAsync({ bank_account_id: values.bank_account_id, file: values.file, source: values.source || null, mapping_json: values.mapping_json || null });
    toast.success(`Imported ${bankImport.fileName || bankImport.id}`);
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading banking" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening banking." />;
  if (!canReadBankAccounts && !canReadTransactions) return <AccessDeniedState description="You need banking permissions to view this workspace." />;
  if (bankAccountsQuery.isLoading || unreconciledQuery.isLoading) return <LoadingScreen label="Loading banking overview" />;
  if (bankAccountsQuery.isError || unreconciledQuery.isError) return <ErrorState description="We couldn't load the banking overview." onRetry={() => { void bankAccountsQuery.refetch(); void unreconciledQuery.refetch(); }} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Banking"}
        title="Banking"
        description="Manage cash accounts, statement imports, and reconciliation queues without moving accounting truth into the frontend."
        actions={<div className="flex flex-wrap gap-2">{canCreateImports ? <Button onClick={() => setIsImportOpen(true)}><Upload className="size-4" />Import statement</Button> : null}{canCreateBankAccounts ? <Button variant="outline" onClick={() => setIsAccountOpen(true)}><Plus className="size-4" />New bank account</Button> : null}</div>}
      />

      <PageActionBar left={<div className="flex items-center gap-2 text-sm text-muted-foreground"><Landmark className="size-4" />Operational banking overview for the active organization.</div>} />

      {bankAccounts.length === 0 ? <EmptyState title="No bank accounts yet" description="Create a bank account before importing statements and reconciling transactions." action={canCreateBankAccounts ? <Button onClick={() => setIsAccountOpen(true)}>Create bank account</Button> : undefined} /> : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Bank accounts</h2>
              <BankAccountListTable bankAccounts={bankAccounts} summaryMap={undefined} />
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Unreconciled transactions</h2>
              {(unreconciledQuery.data?.length ?? 0) > 0 ? <BankTransactionListTable transactions={unreconciledQuery.data ?? []} /> : <EmptyState title="No unreconciled transactions" description="Your backend queue currently has no unreconciled bank items." />}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Recent imports</h2>
              {(importsQuery.data?.length ?? 0) > 0 ? <BankImportListTable imports={importsQuery.data ?? []} /> : <EmptyState title="No imports yet" description="Statement import history will appear here once bank files are uploaded." />}
            </section>
          </div>

          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <ReconciliationSummaryCard summary={reconciliationSummaryQuery.data} />
            <CashbookSummaryCard items={cashbookQuery.data ?? []} />
          </div>
        </div>
      )}

      <BankAccountFormDialog open={isAccountOpen} onOpenChange={setIsAccountOpen} bankAccount={null} glAccounts={accountsQuery.data ?? []} onSubmit={handleCreateBankAccount} isSubmitting={createBankAccountMutation.isPending} />
      <BankImportUploadDialog open={isImportOpen} onOpenChange={setIsImportOpen} bankAccounts={bankAccounts} onSubmit={handleCreateImport} isSubmitting={createImportMutation.isPending} />
    </div>
  );
}
