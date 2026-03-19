import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { Customer, CustomerBalance } from "@/features/customers/types";

export function CustomerBalanceCard({ customer, balance }: { customer: Customer; balance?: CustomerBalance }) {
  return (
    <EntitySummaryCard
      title="Receivables balance"
      description="Backend-calculated AR position for this customer."
      rows={[
        { label: "Total invoiced", value: <MoneyDisplay value={balance?.totalInvoiced ?? 0} currencyCode={customer.currencyCode} /> },
        { label: "Total paid", value: <MoneyDisplay value={balance?.totalPaid ?? 0} currencyCode={customer.currencyCode} /> },
        { label: "Outstanding", value: <MoneyDisplay value={balance?.totalOutstanding ?? 0} currencyCode={customer.currencyCode} /> },
      ]}
    />
  );
}
