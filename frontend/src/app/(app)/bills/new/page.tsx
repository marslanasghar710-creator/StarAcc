"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { useAccounts } from "@/features/accounts/hooks";
import { BillForm } from "@/features/bills/components/bill-form";
import { useCreateBill } from "@/features/bills/hooks";
import type { BillFormValues } from "@/features/bills/schemas";
import { usePermissions } from "@/features/permissions/hooks";
import { useSuppliers } from "@/features/suppliers/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: BillFormValues) {
  return {
    supplier_id: values.supplier_id,
    issue_date: values.issue_date,
    due_date: values.due_date,
    currency_code: values.currency_code.trim().toUpperCase(),
    reference: values.reference?.trim() || null,
    supplier_invoice_number: values.supplier_invoice_number?.trim() || null,
    notes: values.notes?.trim() || null,
    terms: values.terms?.trim() || null,
    items: values.items.map((item) => ({ description: item.description.trim(), quantity: item.quantity, unit_price: item.unit_price, account_id: item.account_id, item_code: item.item_code?.trim() || null, discount_percent: item.discount_percent || null, discount_amount: item.discount_amount || null, tax_code_id: item.tax_code_id || null })),
  };
}

export default function NewBillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledSupplierId = searchParams.get("supplierId");
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canCreate = can("bills.create");
  const canReadSuppliers = can("suppliers.read");
  const canReadAccounts = can("accounts.read");
  const suppliersQuery = useSuppliers(currentOrganizationId ?? undefined, "", canReadSuppliers);
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canReadAccounts);
  const createMutation = useCreateBill(currentOrganizationId ?? undefined);

  async function handleSubmit(values: BillFormValues) {
    const bill = await createMutation.mutateAsync(toPayload(values));
    toast.success(`Saved ${bill.billNumber}`);
    router.push(`/bills/${bill.id}`);
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Preparing bill form" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before creating a bill." />;
  if (!canCreate) return <AccessDeniedState description="You need bills.create to create draft bills." />;
  if (!canReadSuppliers || !canReadAccounts) return <AccessDeniedState description="You need suppliers.read and accounts.read to build bill drafts with real supplier and expense account selections." />;
  if (suppliersQuery.isLoading || accountsQuery.isLoading) return <LoadingScreen label="Loading bill dependencies" />;
  if (suppliersQuery.isError || accountsQuery.isError) return <ErrorState description="We couldn't load the supplier or account data needed to create a bill." onRetry={() => { void suppliersQuery.refetch(); void accountsQuery.refetch(); }} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Bills" title="New bill" description="Create a draft purchase bill. Approval and posting remain separate backend workflows." />
      <BillForm suppliers={suppliersQuery.data ?? []} accountOptions={accountsQuery.data ?? []} onSubmit={handleSubmit} isSubmitting={createMutation.isPending} submitLabel="Save draft" prefilledSupplierId={prefilledSupplierId} />
    </div>
  );
}
