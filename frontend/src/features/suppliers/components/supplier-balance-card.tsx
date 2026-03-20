import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { Supplier, SupplierBalance } from "@/features/suppliers/types";

export function SupplierBalanceCard({ supplier, balance }: { supplier: Supplier; balance?: SupplierBalance }) {
  return (
    <EntitySummaryCard
      title="Payables balance"
      description="Backend-calculated AP exposure for this supplier."
      rows={[
        { label: "Total billed", value: <MoneyDisplay value={balance?.totalBilled ?? 0} currencyCode={supplier.currencyCode} /> },
        { label: "Total paid", value: <MoneyDisplay value={balance?.totalPaid ?? 0} currencyCode={supplier.currencyCode} /> },
        { label: "Outstanding", value: <MoneyDisplay value={balance?.totalOutstanding ?? 0} currencyCode={supplier.currencyCode} /> },
      ]}
    />
  );
}
