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
import { SupplierActivityPanel } from "@/features/suppliers/components/supplier-activity-panel";
import { SupplierBalanceCard } from "@/features/suppliers/components/supplier-balance-card";
import { SupplierDetailCard } from "@/features/suppliers/components/supplier-detail-card";
import { SupplierFormDialog } from "@/features/suppliers/components/supplier-form-dialog";
import { useArchiveSupplier, useSupplier, useSupplierActivity, useSupplierBalance, useUpdateSupplier } from "@/features/suppliers/hooks";
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

export default function SupplierDetailPage() {
  const params = useParams<{ supplierId: string }>();
  const router = useRouter();
  const supplierId = params.supplierId;
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("suppliers.read");
  const canUpdate = can("suppliers.update");
  const canArchive = can("suppliers.archive");
  const canReadBalance = can("ap.read");
  const supplierQuery = useSupplier(currentOrganizationId ?? undefined, supplierId, canRead);
  const balanceQuery = useSupplierBalance(currentOrganizationId ?? undefined, supplierId, canReadBalance);
  const activityQuery = useSupplierActivity(currentOrganizationId ?? undefined, supplierId, canRead);
  const updateMutation = useUpdateSupplier(currentOrganizationId ?? undefined, supplierId);
  const archiveMutation = useArchiveSupplier(currentOrganizationId ?? undefined, supplierId);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = React.useState(false);

  async function handleUpdate(values: SupplierFormValues) {
    const supplier = await updateMutation.mutateAsync(toPayload(values));
    toast.success(`Updated ${supplier.displayName}`);
  }

  async function handleArchive() {
    try {
      await archiveMutation.mutateAsync();
      toast.success("Supplier archived");
      router.push("/suppliers");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive supplier.");
    }
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading supplier" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening supplier details." />;
  if (!canRead) return <AccessDeniedState description="You need suppliers.read to view supplier details." />;
  if (supplierQuery.isLoading) return <LoadingScreen label="Loading supplier details" />;
  if (supplierQuery.isError) return <ErrorState title="Supplier unavailable" description="We couldn't load this supplier." onRetry={() => void supplierQuery.refetch()} />;
  if (!supplierQuery.data) return <EmptyState title="Supplier not found" description="The requested supplier could not be found in the active organization." />;

  const supplier = supplierQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Suppliers" title={supplier.displayName} description="Review supplier profile, AP exposure, and recent purchasing activity." actions={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={`/bills/new?supplierId=${supplier.id}`}><FilePlus2 className="size-4" />New bill</Link></Button>{canUpdate ? <Button variant="outline" onClick={() => setIsEditOpen(true)}><Pencil className="size-4" />Edit</Button> : null}{canArchive && supplier.isActive ? <Button variant="destructive" onClick={() => setIsArchiveOpen(true)}><Archive className="size-4" />Archive</Button> : null}</div>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <div className="space-y-6">
          <SupplierDetailCard supplier={supplier} />
          <SupplierActivityPanel entries={activityQuery.data ?? []} />
        </div>
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          {canReadBalance ? <SupplierBalanceCard supplier={supplier} balance={balanceQuery.data} /> : <EmptyState title="Balance unavailable" description="You need ap.read to view supplier balance details." />}
        </div>
      </div>
      <SupplierFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} supplier={supplier} onSubmit={handleUpdate} isSubmitting={updateMutation.isPending} />
      <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive supplier</DialogTitle><DialogDescription>Archiving keeps the supplier for historical reporting while removing it from active purchasing workflows.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setIsArchiveOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => void handleArchive()} disabled={archiveMutation.isPending}>{archiveMutation.isPending ? "Archiving…" : "Archive supplier"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
