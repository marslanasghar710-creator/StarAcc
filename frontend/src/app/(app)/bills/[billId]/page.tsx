"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Pencil, Stamp, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BillApproveDialog } from "@/features/bills/components/bill-approve-dialog";
import { BillAttachmentsPanel } from "@/features/bills/components/bill-attachments-panel";
import { BillDetailCard } from "@/features/bills/components/bill-detail-card";
import { BillForm } from "@/features/bills/components/bill-form";
import { BillPaymentStatusCard } from "@/features/bills/components/bill-payment-status-card";
import { BillPostDialog } from "@/features/bills/components/bill-post-dialog";
import { BillStatusBadge } from "@/features/bills/components/bill-status-badge";
import { BillTotalsCard } from "@/features/bills/components/bill-totals-card";
import { BillVoidDialog } from "@/features/bills/components/bill-void-dialog";
import { useAddBillItem, useApproveBill, useBill, useBillAttachments, useBillAvailableFiles, useDeleteBill, useDeleteBillItem, useLinkBillFile, usePostBill, useUpdateBill, useUpdateBillItem, useVoidBill } from "@/features/bills/hooks";
import type { BillFormValues } from "@/features/bills/schemas";
import type { BillItem } from "@/features/bills/types";
import { useAccounts } from "@/features/accounts/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { useSuppliers } from "@/features/suppliers/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toUpdatePayload(values: BillFormValues) {
  return {
    due_date: values.due_date,
    reference: values.reference?.trim() || null,
    supplier_invoice_number: values.supplier_invoice_number?.trim() || null,
    notes: values.notes?.trim() || null,
    terms: values.terms?.trim() || null,
  };
}

export default function BillDetailPage() {
  const params = useParams<{ billId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const billId = params.billId;
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("bills.read");
  const canUpdate = can("bills.update");
  const canApprove = can("bills.approve");
  const canPost = can("bills.post");
  const canVoid = can("bills.void");
  const canReadSuppliers = can("suppliers.read");
  const canReadAccounts = can("accounts.read");
  const canReadFiles = can("files.read");
  const canLinkFiles = can("files.link");

  const billQuery = useBill(currentOrganizationId ?? undefined, billId, canRead);
  const suppliersQuery = useSuppliers(currentOrganizationId ?? undefined, "", canReadSuppliers);
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canReadAccounts);
  const attachmentsQuery = useBillAttachments(currentOrganizationId ?? undefined, billId, canReadFiles);
  const filesQuery = useBillAvailableFiles(currentOrganizationId ?? undefined, canReadFiles && canLinkFiles);
  const updateMutation = useUpdateBill(currentOrganizationId ?? undefined, billId);
  const approveMutation = useApproveBill(currentOrganizationId ?? undefined, billId);
  const postMutation = usePostBill(currentOrganizationId ?? undefined, billId);
  const voidMutation = useVoidBill(currentOrganizationId ?? undefined, billId);
  const deleteMutation = useDeleteBill(currentOrganizationId ?? undefined, billId);
  const linkFileMutation = useLinkBillFile(currentOrganizationId ?? undefined, billId);
  const addItemMutation = useAddBillItem(currentOrganizationId ?? undefined, billId);
  const updateItemMutation = useUpdateBillItem(currentOrganizationId ?? undefined, billId);
  const deleteItemMutation = useDeleteBillItem(currentOrganizationId ?? undefined, billId);

  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isPostOpen, setIsPostOpen] = React.useState(false);
  const [isVoidOpen, setIsVoidOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const bill = billQuery.data;
  const isDraft = bill?.status === "draft";
  const isEditMode = mode === "edit" && isDraft && canUpdate;

  async function handleUpdate(values: BillFormValues) {
    const updated = await updateMutation.mutateAsync(toUpdatePayload(values));

    const existingItems = new Map<string, BillItem>((bill.items ?? []).filter((item): item is BillItem & { id: string } => Boolean(item.id)).map((item) => [item.id, item]));
    const submittedIds = new Set(values.items.flatMap((item) => item.id ? [item.id] : []));

    for (const existing of bill.items) {
      if (existing.id && !submittedIds.has(existing.id)) {
        await deleteItemMutation.mutateAsync(existing.id);
      }
    }

    for (const item of values.items) {
      const payload = {
        description: item.description.trim(),
        quantity: item.quantity,
        unit_price: item.unit_price,
        account_id: item.account_id,
        item_code: item.item_code?.trim() || null,
        discount_percent: item.discount_percent || null,
        discount_amount: item.discount_amount || null,
        tax_code_id: item.tax_code_id || null,
      };

      if (!item.id) {
        await addItemMutation.mutateAsync(payload);
        continue;
      }

      const previous = existingItems.get(item.id);
      const changed = !previous
        || previous.description !== payload.description
        || previous.quantity !== payload.quantity
        || previous.unitPrice !== payload.unit_price
        || previous.accountId !== payload.account_id
        || (previous.itemCode ?? null) !== payload.item_code
        || (previous.discountPercent ?? null) !== payload.discount_percent
        || (previous.discountAmount ?? null) !== payload.discount_amount
        || (previous.taxCodeId ?? null) !== payload.tax_code_id;

      if (changed) {
        await updateItemMutation.mutateAsync({ itemId: item.id, payload });
      }
    }

    toast.success(`Saved ${updated.billNumber}`);
    router.push(`/bills/${updated.id}`);
  }

  async function handleApprove() {
    setActionError(null);
    try {
      await approveMutation.mutateAsync();
      toast.success("Bill approved");
      setIsApproveOpen(false);
      await billQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to approve bill.");
    }
  }

  async function handlePost() {
    setActionError(null);
    try {
      await postMutation.mutateAsync();
      toast.success("Bill posted");
      setIsPostOpen(false);
      await billQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to post bill.");
    }
  }

  async function handleVoid(reason: string) {
    setActionError(null);
    try {
      await voidMutation.mutateAsync(reason || "Voided from bill detail screen");
      toast.success("Bill voided");
      setIsVoidOpen(false);
      await billQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to void bill.");
    }
  }

  async function handleDeleteDraft() {
    setActionError(null);
    try {
      await deleteMutation.mutateAsync();
      toast.success("Draft bill deleted");
      router.push("/bills");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete draft bill.");
    }
  }

  async function handleLinkFile(fileId: string, label?: string) {
    await linkFileMutation.mutateAsync({ fileId, label });
    toast.success("Attachment linked");
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading bill" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening bill details." />;
  if (!canRead) return <AccessDeniedState description="You need bills.read to view bill details." />;
  if (billQuery.isLoading || (isEditMode && (suppliersQuery.isLoading || accountsQuery.isLoading))) return <LoadingScreen label="Loading bill details" />;
  if (billQuery.isError) return <ErrorState title="Bill unavailable" description="We couldn't load this bill." onRetry={() => void billQuery.refetch()} />;
  if (!bill) return <EmptyState title="Bill not found" description="The requested bill does not exist in the active organization." />;

  const canEditFinancials = isDraft && canUpdate;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bills"
        title={`${bill.billNumber} · ${bill.supplierName || bill.supplierId}`}
        description={isDraft ? "Draft bills can be edited, approved, or deleted based on permissions." : "Approved, posted, and settled bills remain backend-driven and read-only for financial integrity."}
        actions={
          <div className="flex flex-wrap gap-2">
            {canEditFinancials ? <Button asChild variant="outline"><Link href={`/bills/${bill.id}?mode=edit`}><Pencil className="size-4" />Edit draft</Link></Button> : null}
            {canApprove && isDraft ? <Button onClick={() => setIsApproveOpen(true)}><Stamp className="size-4" />Approve bill</Button> : null}
            {canPost && bill.status === "approved" ? <Button variant="outline" onClick={() => setIsPostOpen(true)}><Stamp className="size-4" />Post bill</Button> : null}
            {canVoid && bill.status !== "voided" && bill.status !== "paid" ? <Button variant="destructive" onClick={() => setIsVoidOpen(true)}><XCircle className="size-4" />Void bill</Button> : null}
            {canEditFinancials ? <Button variant="ghost" onClick={() => void handleDeleteDraft()} disabled={deleteMutation.isPending}><Trash2 className="size-4" />Delete draft</Button> : null}
          </div>
        }
      />

      {isEditMode ? (
        !canReadSuppliers || !canReadAccounts ? <AccessDeniedState description="You need suppliers.read and accounts.read to safely edit a draft bill." /> : suppliersQuery.isError || accountsQuery.isError ? <ErrorState description="We couldn't load the supplier or account data needed to edit this bill." onRetry={() => { void suppliersQuery.refetch(); void accountsQuery.refetch(); }} /> : <BillForm bill={bill} suppliers={suppliersQuery.data ?? []} accountOptions={accountsQuery.data ?? []} onSubmit={handleUpdate} isSubmitting={updateMutation.isPending} submitLabel="Save draft" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="space-y-6">
            <BillDetailCard bill={bill} />
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Line items</CardTitle>
                <CardDescription>Backend-calculated bill lines and totals. Financial edits are only available while the bill is in draft.</CardDescription>
              </CardHeader>
              <CardContent>
                {bill.items.length === 0 ? (
                  <EmptyState title="No bill items" description="This bill detail response did not include any line items." />
                ) : (
                  <div className="rounded-xl border border-border/70">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit price</TableHead>
                          <TableHead>Tax code</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bill.items.map((item) => (
                          <TableRow key={item.id ?? item.lineNumber}>
                            <TableCell>{item.lineNumber}</TableCell>
                            <TableCell><div className="font-medium">{item.description}</div>{item.itemCode ? <div className="text-muted-foreground">Item code: {item.itemCode}</div> : null}</TableCell>
                            <TableCell>{item.accountCode || item.accountName ? `${item.accountCode ?? ""} ${item.accountName ?? ""}`.trim() : <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                            <TableCell className="text-right"><MoneyDisplay value={item.unitPrice} currencyCode={bill.currencyCode} className="justify-end" /></TableCell>
                            <TableCell>{item.taxCodeName || item.taxCodeId || <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell className="text-right"><MoneyDisplay value={item.lineSubtotal} currencyCode={bill.currencyCode} className="justify-end" /></TableCell>
                            <TableCell className="text-right"><MoneyDisplay value={item.lineTaxAmount} currencyCode={bill.currencyCode} className="justify-end" /></TableCell>
                            <TableCell className="text-right"><MoneyDisplay value={item.lineTotal} currencyCode={bill.currencyCode} className="justify-end" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Workflow state</CardTitle><CardDescription>Primary AP state signals for this bill.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><BillStatusBadge bill={bill} /></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Issue date</span><DateDisplay value={bill.issueDate} /></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Due date</span><DateDisplay value={bill.dueDate} /></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Reference</span><span>{bill.reference || "—"}</span></div></CardContent></Card>
            <BillTotalsCard bill={bill} />
            <BillPaymentStatusCard bill={bill} />
            <BillAttachmentsPanel attachments={attachmentsQuery.data ?? []} availableFiles={filesQuery.data ?? []} canLink={canLinkFiles} canReadFiles={canReadFiles} onLink={handleLinkFile} isLinking={linkFileMutation.isPending} organizationId={currentOrganizationId} />
          </div>
        </div>
      )}

      <BillApproveDialog open={isApproveOpen} onOpenChange={setIsApproveOpen} onConfirm={handleApprove} isSubmitting={approveMutation.isPending} error={actionError} />
      <BillPostDialog open={isPostOpen} onOpenChange={setIsPostOpen} onConfirm={handlePost} isSubmitting={postMutation.isPending} error={actionError} />
      <BillVoidDialog open={isVoidOpen} onOpenChange={setIsVoidOpen} onConfirm={handleVoid} isSubmitting={voidMutation.isPending} error={actionError} />
    </div>
  );
}
