"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, FilePlus2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomerActivityPanel } from "@/features/customers/components/customer-activity-panel";
import { CustomerBalanceCard } from "@/features/customers/components/customer-balance-card";
import { CustomerDetailCard } from "@/features/customers/components/customer-detail-card";
import { CustomerFormDialog } from "@/features/customers/components/customer-form-dialog";
import { useArchiveCustomer, useCustomer, useCustomerActivity, useCustomerBalance, useUpdateCustomer } from "@/features/customers/hooks";
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

export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const customerId = params.customerId;
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("customers.read");
  const canUpdate = can("customers.update");
  const canArchive = can("customers.archive");
  const canReadBalance = can("ar.read");
  const customerQuery = useCustomer(currentOrganizationId ?? undefined, customerId, canRead);
  const balanceQuery = useCustomerBalance(currentOrganizationId ?? undefined, customerId, canReadBalance);
  const activityQuery = useCustomerActivity(currentOrganizationId ?? undefined, customerId, canRead);
  const updateMutation = useUpdateCustomer(currentOrganizationId ?? undefined, customerId);
  const archiveMutation = useArchiveCustomer(currentOrganizationId ?? undefined, customerId);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = React.useState(false);

  async function handleUpdate(values: CustomerFormValues) {
    const customer = await updateMutation.mutateAsync(toPayload(values));
    toast.success(`Updated ${customer.displayName}`);
  }

  async function handleArchive() {
    try {
      await archiveMutation.mutateAsync();
      toast.success("Customer archived");
      router.push("/customers");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive customer.");
    }
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading customer" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening customer details." />;
  if (!canRead) return <AccessDeniedState description="You need customers.read to view customer details." />;
  if (customerQuery.isLoading) return <LoadingScreen label="Loading customer details" />;
  if (customerQuery.isError) return <ErrorState title="Customer unavailable" description="We couldn't load this customer." onRetry={() => void customerQuery.refetch()} />;
  if (!customerQuery.data) return <EmptyState title="Customer not found" description="The requested customer could not be found in the active organization." />;

  const customer = customerQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title={customer.displayName}
        description="Review customer profile, receivables exposure, and recent operational activity."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`/invoices/new?customerId=${customer.id}`}><FilePlus2 className="size-4" />New invoice</Link></Button>
            {canUpdate ? <Button variant="outline" onClick={() => setIsEditOpen(true)}><Pencil className="size-4" />Edit</Button> : null}
            {canArchive && customer.isActive ? <Button variant="destructive" onClick={() => setIsArchiveOpen(true)}><Archive className="size-4" />Archive</Button> : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <div className="space-y-6">
          <CustomerDetailCard customer={customer} />
          <CustomerActivityPanel entries={activityQuery.data ?? []} />
        </div>
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          {canReadBalance ? <CustomerBalanceCard customer={customer} balance={balanceQuery.data} /> : <EmptyState title="Balance unavailable" description="You need ar.read to view customer balance details." />}
        </div>
      </div>

      <CustomerFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} customer={customer} onSubmit={handleUpdate} isSubmitting={updateMutation.isPending} />
      <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive customer</DialogTitle>
            <DialogDescription>Archiving keeps the customer for historical reporting while removing it from active sales workflows.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void handleArchive()} disabled={archiveMutation.isPending}>{archiveMutation.isPending ? "Archiving…" : "Archive customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
