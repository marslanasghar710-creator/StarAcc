"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { useCustomers } from "@/features/customers/hooks";
import { InvoiceFilters, type InvoiceFiltersValue } from "@/features/invoices/components/invoice-filters";
import { InvoiceListTable } from "@/features/invoices/components/invoice-list-table";
import { getInvoiceDisplayStatus } from "@/features/invoices/schemas";
import { useInvoices } from "@/features/invoices/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function matchesDateRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export default function InvoicesPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("invoices.read");
  const canCreate = can("invoices.create");
  const invoicesQuery = useInvoices(currentOrganizationId ?? undefined, "", canRead);
  const customersQuery = useCustomers(currentOrganizationId ?? undefined, "", can("customers.read"));
  const [filters, setFilters] = React.useState<InvoiceFiltersValue>({ search: "", status: "all", scope: "all", dateFrom: "", dateTo: "" });

  const customerMap = React.useMemo(() => new Map((customersQuery.data ?? []).map((customer) => [customer.id, customer.displayName])), [customersQuery.data]);

  const filteredInvoices = React.useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    return (invoicesQuery.data ?? []).filter((invoice) => {
      const displayStatus = getInvoiceDisplayStatus(invoice.status, invoice.amountDue, invoice.dueDate);
      const customerName = invoice.customerName ?? customerMap.get(invoice.customerId) ?? "";
      const matchesSearch = !searchTerm ? true : [invoice.invoiceNumber, invoice.reference, customerName].some((value) => value?.toLowerCase().includes(searchTerm));
      const matchesStatus = filters.status === "all" ? true : invoice.status === filters.status;
      const matchesScope = filters.scope === "all" ? true : filters.scope === "open" ? Number(invoice.amountDue) > 0 : displayStatus === "overdue";
      const matchesDates = matchesDateRange(invoice.issueDate, filters.dateFrom, filters.dateTo);
      return matchesSearch && matchesStatus && matchesScope && matchesDates;
    }).map((invoice) => ({ ...invoice, customerName: invoice.customerName ?? customerMap.get(invoice.customerId) ?? null }));
  }, [customerMap, filters.dateFrom, filters.dateTo, filters.scope, filters.search, filters.status, invoicesQuery.data]);

  if (isLoadingOrganizations) return <LoadingScreen label="Loading invoices" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening invoices." />;
  if (!canRead) return <AccessDeniedState description="You need invoices.read to view invoices." />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Sales"}
        title="Invoices"
        description="Track draft, approved, sent, posted, and paid sales invoices for the active organization."
        actions={canCreate ? <Button asChild><Link href="/invoices/new"><Plus className="size-4" />New invoice</Link></Button> : null}
      />
      <PageActionBar left={<InvoiceFilters filters={filters} onChange={setFilters} />} />
      {invoicesQuery.isLoading ? <LoadingScreen label="Loading invoices" /> : null}
      {invoicesQuery.isError ? <ErrorState description="We couldn't load invoices for this organization." onRetry={() => void invoicesQuery.refetch()} /> : null}
      {!invoicesQuery.isLoading && !invoicesQuery.isError && filteredInvoices.length === 0 ? <EmptyState title={filters.search ? "No matching invoices" : "No invoices yet"} description={filters.search ? "Try a different search or filter." : "Create the first invoice to begin sales workflows."} action={canCreate ? <Button asChild><Link href="/invoices/new">Create invoice</Link></Button> : undefined} /> : null}
      {!invoicesQuery.isLoading && !invoicesQuery.isError && filteredInvoices.length > 0 ? <InvoiceListTable invoices={filteredInvoices} /> : null}
    </div>
  );
}
