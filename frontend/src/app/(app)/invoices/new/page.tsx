"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { useAccounts } from "@/features/accounts/hooks";
import { useCustomers } from "@/features/customers/hooks";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";
import { useCreateInvoice } from "@/features/invoices/hooks";
import type { InvoiceFormValues } from "@/features/invoices/schemas";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: InvoiceFormValues) {
  return {
    customer_id: values.customer_id,
    issue_date: values.issue_date,
    due_date: values.due_date,
    currency_code: values.currency_code.trim().toUpperCase(),
    reference: values.reference?.trim() || null,
    customer_po_number: values.customer_po_number?.trim() || null,
    notes: values.notes?.trim() || null,
    terms: values.terms?.trim() || null,
    items: values.items.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity,
      unit_price: item.unit_price,
      account_id: item.account_id,
      item_code: item.item_code?.trim() || null,
      discount_percent: item.discount_percent || null,
      discount_amount: item.discount_amount || null,
      tax_code_id: item.tax_code_id || null,
    })),
  };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledCustomerId = searchParams.get("customerId");
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canCreate = can("invoices.create");
  const canReadCustomers = can("customers.read");
  const canReadAccounts = can("accounts.read");
  const customersQuery = useCustomers(currentOrganizationId ?? undefined, "", canReadCustomers);
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canReadAccounts);
  const createMutation = useCreateInvoice(currentOrganizationId ?? undefined);

  async function handleSubmit(values: InvoiceFormValues) {
    const invoice = await createMutation.mutateAsync(toPayload(values));
    toast.success(`Saved ${invoice.invoiceNumber}`);
    router.push(`/invoices/${invoice.id}`);
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Preparing invoice form" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before creating an invoice." />;
  if (!canCreate) return <AccessDeniedState description="You need invoices.create to create draft invoices." />;
  if (!canReadCustomers || !canReadAccounts) return <AccessDeniedState description="You need customers.read and accounts.read to build invoice drafts with real customer and revenue account selections." />;
  if (customersQuery.isLoading || accountsQuery.isLoading) return <LoadingScreen label="Loading invoice dependencies" />;
  if (customersQuery.isError || accountsQuery.isError) return <ErrorState description="We couldn't load the customer or account data needed to create an invoice." onRetry={() => { void customersQuery.refetch(); void accountsQuery.refetch(); }} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Invoices" title="New invoice" description="Create a draft sales invoice. Approval, sending, and posting remain separate backend workflows." />
      <InvoiceForm customers={customersQuery.data ?? []} accountOptions={accountsQuery.data ?? []} onSubmit={handleSubmit} isSubmitting={createMutation.isPending} submitLabel="Save draft" prefilledCustomerId={prefilledCustomerId} />
    </div>
  );
}
