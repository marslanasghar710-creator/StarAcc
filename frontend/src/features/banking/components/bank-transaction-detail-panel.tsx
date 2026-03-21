import { DateDisplay } from "@/components/shared/date-display";
import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { BankTransactionStatusBadge } from "@/features/banking/components/bank-transaction-status-badge";
import type { BankTransaction } from "@/features/banking/types";

export function BankTransactionDetailPanel({ transaction }: { transaction: BankTransaction }) {
  return (
    <EntitySummaryCard
      title="Transaction details"
      description="Raw bank transaction attributes and current reconciliation context from the backend."
      rows={[
        { label: "Transaction date", value: <DateDisplay value={transaction.transactionDate} /> },
        { label: "Posted date", value: <DateDisplay value={transaction.postedDate} /> },
        { label: "Description", value: transaction.description },
        { label: "Payee", value: transaction.payee || "—" },
        { label: "Reference", value: transaction.reference || "—" },
        { label: "Amount", value: <MoneyDisplay value={transaction.amount} currencyCode={transaction.currencyCode} /> },
        { label: "Running balance", value: <MoneyDisplay value={transaction.runningBalance ?? 0} currencyCode={transaction.currencyCode} /> },
        { label: "Bank account", value: transaction.bankAccountName || transaction.bankAccountId },
        { label: "Status", value: <BankTransactionStatusBadge status={transaction.status} /> },
        { label: "Matched entity", value: transaction.matchedEntityType && transaction.matchedEntityId ? `${transaction.matchedEntityType} · ${transaction.matchedEntityId}` : "—" },
        { label: "Matched journal", value: transaction.matchedJournalId || "—" },
        { label: "Target account", value: transaction.targetAccountCode || transaction.targetAccountName || transaction.targetAccountId || "—" },
        { label: "Reconciled at", value: <DateDisplay value={transaction.reconciledAt} includeTime /> },
        { label: "Reconciled by", value: transaction.reconciledBy || "—" },
        { label: "Notes", value: transaction.notes || transaction.memo || "—" },
      ]}
    />
  );
}
