"use client";

import * as React from "react";
import { useQueries } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { SupplierFilters } from "@/features/suppliers/components/supplier-filters";
import { SupplierFormDialog } from "@/features/suppliers/components/supplier-form-dialog";
import { SupplierListTable } from "@/features/suppliers/components/supplier-list-table";
import { getSupplierBalance } from "@/features/suppliers/api";
import { useCreateSupplier, useSuppliers } from "@/features/suppliers/hooks";
import type { SupplierFormValues } from "@/features/suppliers/schemas";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: SupplierFormValues) {
  return {
    display_name: values.display_name.trim(),
    legal_name: values.legal_name?.trim() || null,
    email: values.email?.trim().toLowerCase() || null,
    phone: values.phone?.trim() || null,
    website: values.website?.trim() || null,
    tax_number: values.tax_number?.trim() || null,
    currency_code: values.currency_code?.trim().toUpperCase() || null,
    payment_terms_days: values.payment_terms_days ? Number.parseInt(values.payment_terms_days, 10) : null,
    notes: values.notes?.trim() || null,
    billing_address_line1: values.billing_address_line1?.trim() || null,
    billing_address_line2: values.billing_address_line2?.trim() || null,
    billing_city: values.billing_city?.trim() || null,
    billing_state: values.billing_state?.trim() || null,
    billing_postal_code: values.billing_postal_code?.trim() || null,
    billing_country: values.billing_country?.trim() || null,
    remittance_address_line1: values.remittance_address_line1?.trim() || null,
    remittance_address_line2: values.remittance_address_line2?.trim() || null,
    remittance_city: values.remittance_city?.trim() || null,
    remittance_state: values.remittance_state?.trim() || null,
    remittance_postal_code: values.remittance_postal_code?.trim() || null,
    remittance_country: values.remittance_country?.trim() || null,
    is_active: values.is_active,
  };
}

export default function SuppliersPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("suppliers.read");
  const canCreate = can("suppliers.create");
  const canReadBalance = can("ap.read");
  const [search, setSearch] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const suppliersQuery = useSuppliers(currentOrganizationId ?? undefined, search, canRead);
  const createMutation = useCreateSupplier(currentOrganizationId ?? undefined);

  const suppliers = suppliersQuery.data ?? [];
  const balanceQueries = useQueries({
    queries: suppliers.slice(0, 8).map((supplier) => ({
      queryKey: currentOrganizationId ? ["suppliers", currentOrganizationId, "balance", supplier.id] : ["suppliers", "missing", "balance", supplier.id],
      queryFn: () => getSupplierBalance(currentOrganizationId as string, supplier.id),
      enabled: canReadBalance && canRead && Boolean(currentOrganizationId),
    })),
  });
  const balanceMap = React.useMemo(() => new Map(balanceQueries.flatMap((query, index) => query.data ? [[suppliers[index].id, query.data] as const] : [])), [balanceQueries, suppliers]);

  async function handleCreate(values: SupplierFormValues) {
    const supplier = await createMutation.mutateAsync(toPayload(values));
    toast.success(`Created supplier ${supplier.displayName}`);
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading suppliers" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening suppliers." />;
  if (!canRead) return <AccessDeniedState description="You need suppliers.read to view suppliers." />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={currentOrganization?.name || "Purchases"} title="Suppliers" description="Maintain payables contacts, settlement terms, and AP lifecycle visibility for the active organization." actions={canCreate ? <Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4" />New supplier</Button> : null} />
      <PageActionBar left={<SupplierFilters search={search} onSearchChange={setSearch} />} />
      {suppliersQuery.isLoading ? <LoadingScreen label="Loading suppliers" /> : null}
      {suppliersQuery.isError ? <ErrorState description="We couldn't load suppliers for this organization." onRetry={() => void suppliersQuery.refetch()} /> : null}
      {!suppliersQuery.isLoading && !suppliersQuery.isError && suppliers.length === 0 ? <EmptyState title={search ? "No matching suppliers" : "No suppliers yet"} description={search ? "Try a different search term." : "Create the first supplier record to begin AP workflows."} action={canCreate ? <Button onClick={() => setIsCreateOpen(true)}>Create supplier</Button> : undefined} /> : null}
      {!suppliersQuery.isLoading && !suppliersQuery.isError && suppliers.length > 0 ? <SupplierListTable suppliers={suppliers} balanceMap={canReadBalance ? balanceMap : undefined} /> : null}
      <SupplierFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onSubmit={handleCreate} isSubmitting={createMutation.isPending} />
    </div>
  );
}
