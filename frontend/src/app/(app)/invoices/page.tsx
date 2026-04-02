"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useCommandActions, useShortcuts } from "@/features/productivity/shortcuts/use-shortcuts";
import { useListNavigation } from "@/features/productivity/workflow/list-navigation";
import { useOrganization } from "@/providers/organization-provider";

function matchesDateRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

const SEARCH_INPUT_ID = "invoices-filter-search";

export default function InvoicesPage() {
  const router = useRouter();
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("invoices.read");
  const canCreate = can("invoices.create");
  const invoicesQuery = useInvoices(currentOrganizationId ?? undefined, "", canRead);
  const customersQuery = useCustomers(currentOrganizationId ?? undefined, "", can("customers.read"));
  const [filters, setFilters] = React.useState<InvoiceFiltersValue>({ search: "", status: "all", scope: "all", dateFrom: "", dateTo: "" });
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

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

  const { selectedId, setSelectedId } = useListNavigation({
    rows: filteredInvoices,
    route: "/invoices",
    onOpen: (invoice) => router.push(`/invoices/${invoice.id}`),
  });

  useShortcuts([
    {
      id: "invoices.focus-search",
      combo: "/",
      description: "Focus invoice search",
      route: "/invoices",
      allowInInput: false,
      handler: () => document.getElementById(SEARCH_INPUT_ID)?.focus(),
    },
    {
      id: "invoices.new",
      combo: "c",
      description: "Create invoice",
      route: "/invoices",
      handler: () => {
        if (canCreate) router.push("/invoices/new");
      },
    },
    {
      id: "invoices.refresh",
      combo: "r",
      description: "Refresh invoices",
      route: "/invoices",
      handler: () => void invoicesQuery.refetch(),
    },
  ]);

  useCommandActions([
    { id: "invoices.new", title: "Create invoice", description: "Open new invoice form", group: "Invoices", perform: () => canCreate ? router.push("/invoices/new") : undefined },
    { id: "invoices.open-selected", title: "Open selected invoice", description: "Open highlighted row", group: "Invoices", perform: () => selectedId ? router.push(`/invoices/${selectedId}`) : undefined },
  ]);

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
      <PageActionBar left={<InvoiceFilters filters={filters} onChange={setFilters} searchInputId={SEARCH_INPUT_ID} />} />
      {invoicesQuery.isLoading ? <LoadingScreen label="Loading invoices" /> : null}
      {invoicesQuery.isError ? <ErrorState description="We couldn't load invoices for this organization." onRetry={() => void invoicesQuery.refetch()} /> : null}
      {!invoicesQuery.isLoading && !invoicesQuery.isError && filteredInvoices.length === 0 ? <EmptyState title={filters.search ? "No matching invoices" : "No invoices yet"} description={filters.search ? "Try a different search or filter." : "Create the first invoice to begin sales workflows."} action={<div className="flex gap-2">{canCreate ? <Button asChild><Link href="/invoices/new">Create invoice</Link></Button> : null}<Button asChild variant="secondary"><Link href="/setup">Open setup center</Link></Button></div>} /> : null}
      {!invoicesQuery.isLoading && !invoicesQuery.isError && filteredInvoices.length > 0 ? <InvoiceListTable invoices={filteredInvoices} selectedId={selectedId} onSelect={setSelectedId} selectedIds={selectedIds} onSelectionChange={setSelectedIds} /> : null}
    </div>
  );
}
