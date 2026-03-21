import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { BankAccount, BankAccountSummary } from "@/features/banking/types";

export function BankAccountSummaryCard({ bankAccount, summary }: { bankAccount: BankAccount; summary?: BankAccountSummary | null }) {
  return (
    <EntitySummaryCard
      title="Cash summary"
      description="Backend-derived cashbook and reconciliation indicators for this bank account."
      rows={[
        { label: "Opening balance", value: <MoneyDisplay value={summary?.openingBalance ?? bankAccount.openingBalance} currencyCode={bankAccount.currencyCode} /> },
        { label: "Ledger balance", value: <MoneyDisplay value={summary?.ledgerBalance ?? 0} currencyCode={bankAccount.currencyCode} /> },
        { label: "Unreconciled delta", value: <MoneyDisplay value={summary?.unreconciledDelta ?? 0} currencyCode={bankAccount.currencyCode} /> },
        { label: "Available balance", value: <MoneyDisplay value={summary?.availableBalance ?? 0} currencyCode={bankAccount.currencyCode} /> },
        { label: "Unreconciled items", value: summary?.unreconciledCount ?? "—" },
        { label: "Ignored items", value: summary?.ignoredCount ?? "—" },
      ]}
    />
  );
}
