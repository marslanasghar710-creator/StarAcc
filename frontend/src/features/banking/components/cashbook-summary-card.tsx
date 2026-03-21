import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { CashbookSummary } from "@/features/banking/types";

export function CashbookSummaryCard({ items }: { items: CashbookSummary[] }) {
  const first = items[0];
  return (
    <EntitySummaryCard
      title="Cashbook summary"
      description="Backend cashbook/cash-position data for the active organization."
      rows={[
        { label: "Primary account", value: first?.bankAccountName || "—" },
        { label: "Opening balance", value: <MoneyDisplay value={first?.openingBalance ?? 0} /> },
        { label: "Ledger balance", value: <MoneyDisplay value={first?.ledgerBalance ?? 0} /> },
        { label: "Unreconciled delta", value: <MoneyDisplay value={first?.unreconciledDelta ?? 0} /> },
      ]}
    />
  );
}
