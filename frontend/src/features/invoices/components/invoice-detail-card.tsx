import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import type { Customer } from "@/features/customers/types";
import type { Invoice } from "@/features/invoices/types";

export function InvoiceDetailCard({ invoice, customer }: { invoice: Invoice; customer?: Customer | null }) {
  return (
    <EntitySummaryCard
      title="Invoice details"
      description="Commercial metadata and status transitions returned by the backend."
      rows={[
        { label: "Invoice number", value: invoice.invoiceNumber },
        { label: "Status", value: <InvoiceStatusBadge invoice={invoice} /> },
        { label: "Customer", value: customer ? <Button asChild variant="link" className="h-auto px-0 py-0"><Link href={`/customers/${customer.id}`}>{customer.displayName}</Link></Button> : (invoice.customerName || invoice.customerId || "—") },
        { label: "Issue date", value: <DateDisplay value={invoice.issueDate} /> },
        { label: "Due date", value: <DateDisplay value={invoice.dueDate} /> },
        { label: "Currency", value: invoice.currencyCode },
        { label: "Reference", value: invoice.reference || "—" },
        { label: "Customer PO", value: invoice.customerPoNumber || "—" },
        { label: "Terms", value: invoice.terms || "—" },
        { label: "Notes", value: invoice.notes || "—" },
        { label: "Approved at", value: <DateDisplay value={invoice.approvedAt} includeTime /> },
        { label: "Sent at", value: <DateDisplay value={invoice.sentAt} includeTime /> },
        { label: "Posted at", value: <DateDisplay value={invoice.postedAt} includeTime /> },
        { label: "Posted journal", value: invoice.postedJournalId ? <Button asChild variant="link" className="h-auto px-0 py-0"><Link href={`/journals/${invoice.postedJournalId}`}>{invoice.postedJournalId}</Link></Button> : "—" },
      ]}
    />
  );
}
