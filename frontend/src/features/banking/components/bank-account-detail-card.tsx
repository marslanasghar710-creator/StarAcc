import { DateDisplay } from "@/components/shared/date-display";
import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { BankAccountStatusBadge } from "@/features/banking/components/bank-account-status-badge";
import type { BankAccount } from "@/features/banking/types";

export function BankAccountDetailCard({ bankAccount }: { bankAccount: BankAccount }) {
  return (
    <EntitySummaryCard
      title="Bank account details"
      description="Banking metadata and linked GL mapping returned by the backend."
      rows={[
        { label: "Name", value: bankAccount.displayName || bankAccount.name },
        { label: "Bank name", value: bankAccount.bankName || "—" },
        { label: "Account type", value: bankAccount.accountType || "—" },
        { label: "Currency", value: bankAccount.currencyCode },
        { label: "GL account", value: bankAccount.glAccountCode || bankAccount.glAccountName || bankAccount.glAccountId },
        { label: "Account #", value: bankAccount.accountNumberMasked || "—" },
        { label: "IBAN", value: bankAccount.ibanMasked || "—" },
        { label: "Opening balance", value: bankAccount.openingBalance },
        { label: "Opening balance date", value: <DateDisplay value={bankAccount.openingBalanceDate} /> },
        { label: "Feed status", value: bankAccount.feedStatus || "—" },
        { label: "Default receipts", value: bankAccount.isDefaultReceiptsAccount ? "Yes" : "No" },
        { label: "Default payments", value: bankAccount.isDefaultPaymentsAccount ? "Yes" : "No" },
        { label: "Status", value: <BankAccountStatusBadge isActive={bankAccount.isActive} /> },
        { label: "Last reconciled", value: <DateDisplay value={bankAccount.lastReconciledAt} includeTime /> },
        { label: "Updated", value: <DateDisplay value={bankAccount.updatedAt} includeTime /> },
      ]}
    />
  );
}
