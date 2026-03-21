"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { useAccounts } from "@/features/accounts/hooks";
import { BankSuggestionList } from "@/features/banking/components/bank-suggestion-list";
import { BankTransactionDetailPanel } from "@/features/banking/components/bank-transaction-detail-panel";
import { IgnoreTransactionDialog } from "@/features/banking/components/ignore-transaction-dialog";
import { ReconcileCashCodeDialog } from "@/features/banking/components/reconcile-cash-code-dialog";
import { ReconcileMatchCustomerPaymentDialog } from "@/features/banking/components/reconcile-match-customer-payment-dialog";
import { ReconcileMatchJournalDialog } from "@/features/banking/components/reconcile-match-journal-dialog";
import { ReconcileMatchSupplierPaymentDialog } from "@/features/banking/components/reconcile-match-supplier-payment-dialog";
import { ReconcileTransferDialog } from "@/features/banking/components/reconcile-transfer-dialog";
import { ReconciliationActionPanel } from "@/features/banking/components/reconciliation-action-panel";
import { UnreconcileTransactionDialog } from "@/features/banking/components/unreconcile-transaction-dialog";
import { useBankAccounts, useBankTransaction, useBankTransactionSuggestions, useCashCodeReconciliation, useCustomerPaymentsForBanking, useIgnoreBankTransaction, useMatchCustomerPaymentReconciliation, useMatchJournalReconciliation, useMatchSupplierPaymentReconciliation, useSupplierPaymentsForBanking, useTransferReconciliation, useUnreconcileBankTransaction } from "@/features/banking/hooks";
import type { CashCodeFormValues, IgnoreTransactionFormValues, TransferFormValues } from "@/features/banking/schemas";
import type { BankSuggestion } from "@/features/banking/types";
import { useJournals } from "@/features/journals/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function BankTransactionDetailPage() {
  const params = useParams<{ transactionId: string }>();
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can, hasAnyPermission } = usePermissions();
  const canRead = can("bank_transactions.read");
  const canReconcile = hasAnyPermission(["bank_transactions.reconcile", "bank_reconciliation.reconcile"]);
  const canIgnore = can("bank_transactions.ignore") || can("bank_transactions.update");
  const canUnreconcile = can("bank_transactions.unreconcile") || can("bank_reconciliation.reconcile");
  const transactionQuery = useBankTransaction(currentOrganizationId ?? undefined, params.transactionId, canRead);
  const suggestionsQuery = useBankTransactionSuggestions(currentOrganizationId ?? undefined, params.transactionId, canRead);
  const bankAccountsQuery = useBankAccounts(currentOrganizationId ?? undefined, "", can("bank_accounts.read"));
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", can("accounts.read"));
  const journalsQuery = useJournals(currentOrganizationId ?? undefined, "", can("journals.read"));
  const customerPaymentsQuery = useCustomerPaymentsForBanking(currentOrganizationId ?? undefined, canRead);
  const supplierPaymentsQuery = useSupplierPaymentsForBanking(currentOrganizationId ?? undefined, canRead);
  const matchCustomerPaymentMutation = useMatchCustomerPaymentReconciliation(currentOrganizationId ?? undefined, params.transactionId);
  const matchSupplierPaymentMutation = useMatchSupplierPaymentReconciliation(currentOrganizationId ?? undefined, params.transactionId);
  const matchJournalMutation = useMatchJournalReconciliation(currentOrganizationId ?? undefined, params.transactionId);
  const cashCodeMutation = useCashCodeReconciliation(currentOrganizationId ?? undefined, params.transactionId);
  const transferMutation = useTransferReconciliation(currentOrganizationId ?? undefined, params.transactionId);
  const ignoreMutation = useIgnoreBankTransaction(currentOrganizationId ?? undefined, params.transactionId);
  const unreconcileMutation = useUnreconcileBankTransaction(currentOrganizationId ?? undefined, params.transactionId);
  const [dialog, setDialog] = React.useState<"customer" | "supplier" | "journal" | "cash-code" | "transfer" | "ignore" | "unreconcile" | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const transaction = transactionQuery.data;

  async function wrapAction(action: () => Promise<unknown>, successMessage: string) {
    setActionError(null);
    try {
      await action();
      toast.success(successMessage);
      setDialog(null);
      await transactionQuery.refetch();
      await suggestionsQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to complete banking action.");
    }
  }

  function handleSuggestion(suggestion: BankSuggestion) {
    if (suggestion.type.includes("customer")) setDialog("customer");
    else if (suggestion.type.includes("supplier")) setDialog("supplier");
    else if (suggestion.type.includes("journal")) setDialog("journal");
    else if (suggestion.type.includes("transfer")) setDialog("transfer");
    else setDialog("cash-code");
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading bank transaction" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening bank transaction details." />;
  if (!canRead) return <AccessDeniedState description="You need bank_transactions.read to view bank transactions." />;
  if (transactionQuery.isLoading || suggestionsQuery.isLoading) return <LoadingScreen label="Loading transaction details" />;
  if (transactionQuery.isError || suggestionsQuery.isError) return <ErrorState description="We couldn't load this bank transaction." onRetry={() => { void transactionQuery.refetch(); void suggestionsQuery.refetch(); }} />;
  if (!transaction) return <EmptyState title="Transaction not found" description="The requested bank transaction could not be found." />;

  const customerPaymentOptions = ((customerPaymentsQuery.data?.items ?? []) as Array<Record<string, unknown>>).map((item) => ({ id: String(item.id ?? item.customer_payment_id ?? ""), label: `${String(item.payment_number ?? item.reference ?? item.id ?? "Payment")} · ${String(item.amount ?? "")}` }));
  const supplierPaymentOptions = ((supplierPaymentsQuery.data?.items ?? []) as Array<Record<string, unknown>>).map((item) => ({ id: String(item.id ?? item.supplier_payment_id ?? ""), label: `${String(item.payment_number ?? item.reference ?? item.id ?? "Payment")} · ${String(item.amount ?? "")}` }));
  const journalOptions = (journalsQuery.data ?? []).map((journal) => ({ id: journal.id, label: `${journal.entryNumber} · ${journal.description}` }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Banking" title={transaction.description} description="Evaluate backend suggestions and choose the correct reconciliation workflow for this bank transaction." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <div className="space-y-6">
          <BankTransactionDetailPanel transaction={transaction} />
          <BankSuggestionList suggestions={suggestionsQuery.data ?? []} onApply={handleSuggestion} />
        </div>
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <ReconciliationActionPanel
            transaction={transaction}
            canReconcile={canReconcile}
            canIgnore={canIgnore}
            canUnreconcile={canUnreconcile}
            onMatchCustomerPayment={() => setDialog("customer")}
            onMatchSupplierPayment={() => setDialog("supplier")}
            onMatchJournal={() => setDialog("journal")}
            onCashCode={() => setDialog("cash-code")}
            onTransfer={() => setDialog("transfer")}
            onIgnore={() => setDialog("ignore")}
            onUnreconcile={() => setDialog("unreconcile")}
          />
        </div>
      </div>

      <ReconcileMatchCustomerPaymentDialog open={dialog === "customer"} onOpenChange={(open) => setDialog(open ? "customer" : null)} options={customerPaymentOptions} onConfirm={(id) => wrapAction(() => matchCustomerPaymentMutation.mutateAsync(id), "Matched customer payment")} isSubmitting={matchCustomerPaymentMutation.isPending} error={actionError} />
      <ReconcileMatchSupplierPaymentDialog open={dialog === "supplier"} onOpenChange={(open) => setDialog(open ? "supplier" : null)} options={supplierPaymentOptions} onConfirm={(id) => wrapAction(() => matchSupplierPaymentMutation.mutateAsync(id), "Matched supplier payment")} isSubmitting={matchSupplierPaymentMutation.isPending} error={actionError} />
      <ReconcileMatchJournalDialog open={dialog === "journal"} onOpenChange={(open) => setDialog(open ? "journal" : null)} options={journalOptions} onConfirm={(id) => wrapAction(() => matchJournalMutation.mutateAsync(id), "Matched journal")} isSubmitting={matchJournalMutation.isPending} error={actionError} />
      <ReconcileCashCodeDialog open={dialog === "cash-code"} onOpenChange={(open) => setDialog(open ? "cash-code" : null)} accountOptions={accountsQuery.data ?? []} onConfirm={(values: CashCodeFormValues) => wrapAction(() => cashCodeMutation.mutateAsync({ target_account_id: values.target_account_id, description: values.description, tax_code_id: values.tax_code_id || null, notes: values.notes || null }), "Cash coded transaction")} isSubmitting={cashCodeMutation.isPending} />
      <ReconcileTransferDialog open={dialog === "transfer"} onOpenChange={(open) => setDialog(open ? "transfer" : null)} sourceBankAccountId={transaction.bankAccountId} bankAccounts={bankAccountsQuery.data ?? []} onConfirm={(values: TransferFormValues) => wrapAction(() => transferMutation.mutateAsync({ destination_bank_account_id: values.destination_bank_account_id, notes: values.notes || null }), "Transferred transaction")} isSubmitting={transferMutation.isPending} />
      <IgnoreTransactionDialog open={dialog === "ignore"} onOpenChange={(open) => setDialog(open ? "ignore" : null)} onConfirm={(values: IgnoreTransactionFormValues) => wrapAction(() => ignoreMutation.mutateAsync(values.reason || undefined), "Ignored transaction")} isSubmitting={ignoreMutation.isPending} />
      <UnreconcileTransactionDialog open={dialog === "unreconcile"} onOpenChange={(open) => setDialog(open ? "unreconcile" : null)} onConfirm={() => wrapAction(() => unreconcileMutation.mutateAsync(undefined), "Transaction moved back to unreconciled")} isSubmitting={unreconcileMutation.isPending} error={actionError} />
    </div>
  );
}
