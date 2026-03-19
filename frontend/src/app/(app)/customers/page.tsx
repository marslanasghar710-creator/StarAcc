"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { CustomerFilters } from "@/features/customers/components/customer-filters";
import { CustomerFormDialog } from "@/features/customers/components/customer-form-dialog";
import { CustomerListTable } from "@/features/customers/components/customer-list-table";
import { useCreateCustomer, useCustomers } from "@/features/customers/hooks";
import type { CustomerFormValues } from "@/features/customers/schemas";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: CustomerFormValues) {
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
    shipping_address_line1: values.shipping_address_line1?.trim() || null,
    shipping_address_line2: values.shipping_address_line2?.trim() || null,
    shipping_city: values.shipping_city?.trim() || null,
    shipping_state: values.shipping_state?.trim() || null,
    shipping_postal_code: values.shipping_postal_code?.trim() || null,
    shipping_country: values.shipping_country?.trim() || null,
    is_active: values.is_active,
  };
}

export default function CustomersPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("customers.read");
  const canCreate = can("customers.create");
  const [search, setSearch] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const customersQuery = useCustomers(currentOrganizationId ?? undefined, search, canRead);
  const createMutation = useCreateCustomer(currentOrganizationId ?? undefined);

  async function handleCreate(values: CustomerFormValues) {
    const customer = await createMutation.mutateAsync(toPayload(values));
    toast.success(`Created customer ${customer.displayName}`);
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading customers" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening customers." />;
  if (!canRead) return <AccessDeniedState description="You need customers.read to view customers." />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Sales"}
        title="Customers"
        description="Maintain receivables contacts, commercial metadata, and lifecycle visibility for the active organization."
        actions={canCreate ? <Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4" />New customer</Button> : null}
      />
      <PageActionBar left={<CustomerFilters search={search} onSearchChange={setSearch} />} />
      {customersQuery.isLoading ? <LoadingScreen label="Loading customers" /> : null}
      {customersQuery.isError ? <ErrorState description="We couldn't load customers for this organization." onRetry={() => void customersQuery.refetch()} /> : null}
      {!customersQuery.isLoading && !customersQuery.isError && (customersQuery.data?.length ?? 0) === 0 ? (
        <EmptyState title={search ? "No matching customers" : "No customers yet"} description={search ? "Try a different search term." : "Create the first customer record to start sales workflows."} action={canCreate ? <Button onClick={() => setIsCreateOpen(true)}>Create customer</Button> : undefined} />
      ) : null}
      {!customersQuery.isLoading && !customersQuery.isError && (customersQuery.data?.length ?? 0) > 0 ? <CustomerListTable customers={customersQuery.data ?? []} /> : null}

      <CustomerFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onSubmit={handleCreate} isSubmitting={createMutation.isPending} />
    </div>
  );
}
