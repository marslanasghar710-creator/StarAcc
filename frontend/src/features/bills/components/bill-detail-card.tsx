import { DateDisplay } from "@/components/shared/date-display";
import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { BillStatusBadge } from "@/features/bills/components/bill-status-badge";
import type { Bill } from "@/features/bills/types";

export function BillDetailCard({ bill }: { bill: Bill }) {
  return (
    <EntitySummaryCard
      title="Bill details"
      description="Commercial, workflow, and audit metadata returned by the backend."
      rows={[
        { label: "Bill number", value: bill.billNumber },
        { label: "Status", value: <BillStatusBadge bill={bill} /> },
        { label: "Supplier", value: bill.supplierName || bill.supplierId },
        { label: "Supplier invoice #", value: bill.supplierInvoiceNumber || "—" },
        { label: "Issue date", value: <DateDisplay value={bill.issueDate} /> },
        { label: "Due date", value: <DateDisplay value={bill.dueDate} /> },
        { label: "Currency", value: bill.currencyCode || "—" },
        { label: "Reference", value: bill.reference || "—" },
        { label: "Terms", value: bill.terms || "—" },
        { label: "Notes", value: bill.notes || "—" },
        { label: "Approved", value: <DateDisplay value={bill.approvedAt} includeTime /> },
        { label: "Posted", value: <DateDisplay value={bill.postedAt} includeTime /> },
        { label: "Posted journal", value: bill.postedJournalId || "—" },
        { label: "Created", value: <DateDisplay value={bill.createdAt} includeTime /> },
        { label: "Updated", value: <DateDisplay value={bill.updatedAt} includeTime /> },
      ]}
    />
  );
}
