"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Archive, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccounts } from "@/features/accounts/hooks";
import { BankAccountDetailCard } from "@/features/banking/components/bank-account-detail-card";
import { BankAccountFormDialog } from "@/features/banking/components/bank-account-form-dialog";
import { BankAccountSummaryCard } from "@/features/banking/components/bank-account-summary-card";
import { BankImportUploadDialog } from "@/features/banking/components/bank-import-upload-dialog";
import { useArchiveBankAccount, useBankAccount, useBankAccountRegister, useBankAccountSummary, useCreateBankImport, useUpdateBankAccount } from "@/features/banking/hooks";
import type { BankAccountFormValues, BankImportUploadValues } from "@/features/banking/schemas";
import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: BankAccountFormValues) {
  return {
    name: values.name.trim(),
    display_name: values.display_name?.trim() || null,
    bank_name: values.bank_name?.trim() || null,
    account_number_masked: values.account_number_masked?.trim() || null,
    iban_masked: values.iban_masked?.trim() || null,
    currency_code: values.currency_code.trim().toUpperCase(),
    account_type: values.account_type?.trim() || null,
    gl_account_id: values.gl_account_id,
    opening_balance: values.opening_balance || "0",
    opening_balance_date: values.opening_balance_date || null,
    is_active: values.is_active,
    is_default_receipts_account: values.is_default_receipts_account,
    is_default_payments_account: values.is_default_payments_account,
  };
}

export default function BankAccountDetailPage() {
  const params = useParams<{ bankAccountId: string }>();
  const router = useRouter();
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const bankAccountId = params.bankAccountId;
  const canRead = can("bank_accounts.read");
  const canUpdate = can("bank_accounts.update");
  const canArchive = can("bank_accounts.archive");
  const canCreateImports = can("bank_imports.create");
  const bankAccountQuery = useBankAccount(currentOrganizationId ?? undefined, bankAccountId, canRead);
  const summaryQuery = useBankAccountSummary(currentOrganizationId ?? undefined, bankAccountId, canRead);
  const registerQuery = useBankAccountRegister(currentOrganizationId ?? undefined, bankAccountId, can("cashbook.read") || can("bank_transactions.read"));
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", can("accounts.read"));
  const updateMutation = useUpdateBankAccount(currentOrganizationId ?? undefined, bankAccountId);
  const archiveMutation = useArchiveBankAccount(currentOrganizationId ?? undefined, bankAccountId);
  const createImportMutation = useCreateBankImport(currentOrganizationId ?? undefined);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);

  async function handleUpdate(values: BankAccountFormValues) {
    const bankAccount = await updateMutation.mutateAsync(toPayload(values));
    toast.success(`Updated ${bankAccount.displayName || bankAccount.name}`);
  }

  async function handleArchive() {
    try {
      await archiveMutation.mutateAsync();
      toast.success("Bank account archived");
      router.push("/banking");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive bank account.");
    }
  }

  async function handleImport(values: BankImportUploadValues) {
    await createImportMutation.mutateAsync({ bank_account_id: values.bank_account_id, file: values.file, source: values.source || null, mapping_json: values.mapping_json || null });
    toast.success("Statement import started");
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading bank account" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening bank account details." />;
  if (!canRead) return <AccessDeniedState description="You need bank_accounts.read to view bank account details." />;
  if (bankAccountQuery.isLoading) return <LoadingScreen label="Loading bank account details" />;
  if (bankAccountQuery.isError) return <ErrorState title="Bank account unavailable" description="We couldn't load this bank account." onRetry={() => void bankAccountQuery.refetch()} />;
  if (!bankAccountQuery.data) return <EmptyState title="Bank account not found" description="The requested bank account could not be found in the active organization." />;

  const bankAccount = bankAccountQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Banking" title={bankAccount.displayName || bankAccount.name} description="Review bank account metadata, summary balances, and register activity." actions={<div className="flex flex-wrap gap-2">{canCreateImports ? <Button onClick={() => setIsImportOpen(true)}><Upload className="size-4" />Import statement</Button> : null}{canUpdate ? <Button variant="outline" onClick={() => setIsEditOpen(true)}><Pencil className="size-4" />Edit</Button> : null}{canArchive && bankAccount.isActive ? <Button variant="destructive" onClick={() => setIsArchiveOpen(true)}><Archive className="size-4" />Archive</Button> : null}</div>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-6">
          <BankAccountDetailCard bankAccount={bankAccount} />
          <div className="rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/70 px-6 py-4"><h2 className="font-semibold">Register preview</h2><p className="text-sm text-muted-foreground">Bank account register rows returned by the backend.</p></div>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Running balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {(registerQuery.data ?? []).map((line) => <TableRow key={line.id}><TableCell><DateDisplay value={line.transactionDate} /></TableCell><TableCell>{line.description}</TableCell><TableCell>{line.reference || <span className="text-muted-foreground">—</span>}</TableCell><TableCell>{line.status || <span className="text-muted-foreground">—</span>}</TableCell><TableCell className="text-right"><MoneyDisplay value={line.amount} currencyCode={bankAccount.currencyCode} className="justify-end" /></TableCell><TableCell className="text-right"><MoneyDisplay value={line.runningBalance ?? 0} currencyCode={bankAccount.currencyCode} className="justify-end" /></TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start"><BankAccountSummaryCard bankAccount={bankAccount} summary={summaryQuery.data} /></div>
      </div>
      <BankAccountFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} bankAccount={bankAccount} glAccounts={accountsQuery.data ?? []} onSubmit={handleUpdate} isSubmitting={updateMutation.isPending} />
      <BankImportUploadDialog open={isImportOpen} onOpenChange={setIsImportOpen} bankAccounts={[bankAccount]} onSubmit={handleImport} isSubmitting={createImportMutation.isPending} />
      <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}><DialogContent><DialogHeader><DialogTitle>Archive bank account</DialogTitle><DialogDescription>Archiving keeps historical cash activity while removing the account from active bank workflows.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsArchiveOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => void handleArchive()} disabled={archiveMutation.isPending}>{archiveMutation.isPending ? "Archiving…" : "Archive bank account"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
