import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { Bill } from "@/features/bills/types";

export function BillTotalsCard({ bill, previewSubtotal }: { bill?: Bill | null; previewSubtotal?: string }) {
  return (
    <EntitySummaryCard
      title="Bill totals"
      description="Backend totals are authoritative after save, approve, and post actions."
      rows={[
        { label: bill ? "Subtotal" : "Draft preview subtotal", value: <MoneyDisplay value={bill?.subtotalAmount ?? previewSubtotal ?? 0} currencyCode={bill?.currencyCode} /> },
        { label: "Tax", value: <MoneyDisplay value={bill?.taxAmount ?? 0} currencyCode={bill?.currencyCode} /> },
        { label: "Total", value: <MoneyDisplay value={bill?.totalAmount ?? previewSubtotal ?? 0} currencyCode={bill?.currencyCode} /> },
        { label: "Amount paid", value: <MoneyDisplay value={bill?.amountPaid ?? 0} currencyCode={bill?.currencyCode} /> },
        { label: "Amount due", value: <MoneyDisplay value={bill?.amountDue ?? 0} currencyCode={bill?.currencyCode} /> },
      ]}
    />
  );
}
