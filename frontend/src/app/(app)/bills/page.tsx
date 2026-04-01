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
import { BillFilters, type BillFiltersValue } from "@/features/bills/components/bill-filters";
import { BillListTable } from "@/features/bills/components/bill-list-table";
import { getBillDisplayStatus } from "@/features/bills/schemas";
import { useBills } from "@/features/bills/hooks";
import { useSuppliers } from "@/features/suppliers/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { useCommandActions, useShortcuts } from "@/features/productivity/shortcuts/use-shortcuts";
import { useListNavigation } from "@/features/productivity/workflow/list-navigation";
import { useOrganization } from "@/providers/organization-provider";

function matchesDateRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

const SEARCH_INPUT_ID = "bills-filter-search";

export default function BillsPage() {
  const router = useRouter();
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("bills.read");
  const canCreate = can("bills.create");
  const billsQuery = useBills(currentOrganizationId ?? undefined, "", canRead);
  const suppliersQuery = useSuppliers(currentOrganizationId ?? undefined, "", can("suppliers.read"));
  const [filters, setFilters] = React.useState<BillFiltersValue>({ search: "", status: "all", scope: "all", dateFrom: "", dateTo: "" });
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const supplierMap = React.useMemo(() => new Map((suppliersQuery.data ?? []).map((supplier) => [supplier.id, supplier.displayName])), [suppliersQuery.data]);

  const filteredBills = React.useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    return (billsQuery.data ?? []).filter((bill) => {
      const displayStatus = getBillDisplayStatus(bill.status, bill.amountDue, bill.dueDate);
      const supplierName = bill.supplierName ?? supplierMap.get(bill.supplierId) ?? "";
      const matchesSearch = !searchTerm ? true : [bill.billNumber, bill.reference, bill.supplierInvoiceNumber, supplierName].some((value) => value?.toLowerCase().includes(searchTerm));
      const matchesStatus = filters.status === "all" ? true : bill.status === filters.status;
      const matchesScope = filters.scope === "all" ? true : filters.scope === "open" ? Number(bill.amountDue) > 0 : displayStatus === "overdue";
      const matchesDates = matchesDateRange(bill.issueDate, filters.dateFrom, filters.dateTo);
      return matchesSearch && matchesStatus && matchesScope && matchesDates;
    }).map((bill) => ({ ...bill, supplierName: bill.supplierName ?? supplierMap.get(bill.supplierId) ?? null }));
  }, [billsQuery.data, filters.dateFrom, filters.dateTo, filters.scope, filters.search, filters.status, supplierMap]);

  const { selectedId, setSelectedId } = useListNavigation({ rows: filteredBills, route: "/bills", onOpen: (bill) => router.push(`/bills/${bill.id}`) });

  useShortcuts([
    { id: "bills.focus-search", combo: "/", description: "Focus bill search", route: "/bills", allowInInput: false, handler: () => document.getElementById(SEARCH_INPUT_ID)?.focus() },
    { id: "bills.new", combo: "c", description: "Create bill", route: "/bills", handler: () => { if (canCreate) router.push("/bills/new"); } },
    { id: "bills.refresh", combo: "r", description: "Refresh bills", route: "/bills", handler: () => void billsQuery.refetch() },
  ]);

  useCommandActions([
    { id: "bills.new", title: "Create bill", description: "Open new bill form", group: "Bills", perform: () => canCreate ? router.push("/bills/new") : undefined },
    { id: "bills.open-selected", title: "Open selected bill", description: "Open highlighted row", group: "Bills", perform: () => selectedId ? router.push(`/bills/${selectedId}`) : undefined },
  ]);

  if (isLoadingOrganizations) return <LoadingScreen label="Loading bills" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening bills." />;
  if (!canRead) return <AccessDeniedState description="You need bills.read to view bills." />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Purchases"} title="Bills" description="Track draft, approved, posted, and paid purchase bills for the active organization." actions={canCreate ? <Button asChild><Link href="/bills/new"><Plus className="size-4" />New bill</Link></Button> : null} />
      <PageActionBar left={<BillFilters filters={filters} onChange={setFilters} searchInputId={SEARCH_INPUT_ID} />} />
      {billsQuery.isLoading ? <LoadingScreen label="Loading bills" /> : null}
      {billsQuery.isError ? <ErrorState description="We couldn't load bills for this organization." onRetry={() => void billsQuery.refetch()} /> : null}
      {!billsQuery.isLoading && !billsQuery.isError && filteredBills.length === 0 ? <EmptyState title={filters.search ? "No matching bills" : "No bills yet"} description={filters.search ? "Try a different search or filter." : "Create the first bill to begin AP workflows."} action={<div className="flex gap-2">{canCreate ? <Button asChild><Link href="/bills/new">Create bill</Link></Button> : null}<Button asChild variant="secondary"><Link href="/setup">Open setup center</Link></Button></div>} /> : null}
      {!billsQuery.isLoading && !billsQuery.isError && filteredBills.length > 0 ? <BillListTable bills={filteredBills} selectedId={selectedId} onSelect={setSelectedId} selectedIds={selectedIds} onSelectionChange={setSelectedIds} /> : null}
    </div>
  );
}
