"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Archive, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { DateDisplay } from "@/components/shared/date-display";
import { DecimalDisplay } from "@/components/shared/decimal-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountBalanceCard } from "@/features/accounts/components/account-balance-card";
import { AccountDetailPanel } from "@/features/accounts/components/account-detail-panel";
import { AccountFormDialog } from "@/features/accounts/components/account-form-dialog";
import { useAccount, useAccountBalance, useAccountLedger, useAccounts, useArchiveAccount, useUpdateAccount } from "@/features/accounts/hooks";
import type { AccountFormValues } from "@/features/accounts/schemas";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toUpdatePayload(values: AccountFormValues) {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    account_subtype: values.account_subtype?.trim() || null,
    parent_account_id: values.parent_account_id || null,
    currency_code: values.currency_code?.trim().toUpperCase() || null,
    is_postable: values.is_postable,
    is_active: values.is_active,
  };
}

export default function AccountDetailPage() {
  const params = useParams<{ accountId: string }>();
  const router = useRouter();
  const accountId = params.accountId;
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("accounts.read");
  const canUpdate = can("accounts.update");
  const canArchive = can("accounts.archive");
  const canReadLedger = can("ledger.read");
  const accountQuery = useAccount(currentOrganizationId ?? undefined, accountId, canRead);
  const balanceQuery = useAccountBalance(currentOrganizationId ?? undefined, accountId, canRead && canReadLedger);
  const ledgerQuery = useAccountLedger(currentOrganizationId ?? undefined, accountId, canRead && canReadLedger);
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canRead);
  const updateMutation = useUpdateAccount(currentOrganizationId ?? undefined, accountId);
  const archiveMutation = useArchiveAccount(currentOrganizationId ?? undefined, accountId);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = React.useState(false);

  async function handleUpdate(values: AccountFormValues) {
    const updated = await updateMutation.mutateAsync(toUpdatePayload(values));
    toast.success(`Updated ${updated.code}`);
  }

  async function handleArchive() {
    try {
      await archiveMutation.mutateAsync();
      toast.success("Account archived");
      setIsArchiveOpen(false);
      router.push("/accounts");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive account.");
    }
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading account" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening account details." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need accounts.read to view account details." />;
  }

  if (accountQuery.isLoading) {
    return <LoadingScreen label="Loading account details" />;
  }

  if (accountQuery.isError) {
    return <ErrorState title="Account unavailable" description="We couldn't load this account. It may have been archived or you may not have access." onRetry={() => void accountQuery.refetch()} />;
  }

  const account = accountQuery.data;

  if (!account) {
    return <EmptyState title="Account not found" description="The requested account could not be found in the active organization." />;
  }

  const parentName = accountsQuery.data?.find((candidate) => candidate.id === account.parentAccountId)?.name;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chart of Accounts"
        title={`${account.code} · ${account.name}`}
        description="Review ledger metadata, current balance visibility, and recent posted activity."
        actions={
          <div className="flex flex-wrap gap-2">
            {canUpdate ? <Button variant="outline" onClick={() => setIsEditOpen(true)}><Pencil className="size-4" />Edit</Button> : null}
            {canArchive && !account.isSystem && account.isActive ? <Button variant="destructive" onClick={() => setIsArchiveOpen(true)}><Archive className="size-4" />Archive</Button> : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
        <div className="space-y-6">
          <AccountDetailPanel account={account} parentAccountName={parentName} />
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Recent posted ledger activity</CardTitle>
              <CardDescription>This preview comes from the posted account ledger endpoint.</CardDescription>
            </CardHeader>
            <CardContent>
              {!canReadLedger ? <EmptyState title="Ledger visibility unavailable" description="You need ledger.read to view account movement and balance snapshots." /> : null}
              {canReadLedger && ledgerQuery.isLoading ? <LoadingScreen label="Loading ledger preview" /> : null}
              {canReadLedger && ledgerQuery.isError ? <ErrorState description="Ledger activity is unavailable right now." onRetry={() => void ledgerQuery.refetch()} /> : null}
              {canReadLedger && !ledgerQuery.isLoading && !ledgerQuery.isError && (ledgerQuery.data?.length ?? 0) === 0 ? <EmptyState title="No posted ledger activity" description="Posted journal lines will appear here once this account has ledger movement." /> : null}
              {canReadLedger && !ledgerQuery.isLoading && !ledgerQuery.isError && (ledgerQuery.data?.length ?? 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerQuery.data?.slice(0, 10).map((line) => (
                      <TableRow key={`${line.journalId}-${line.entryNumber}-${line.entryDate}`}>
                        <TableCell>{line.entryNumber}</TableCell>
                        <TableCell><DateDisplay value={line.entryDate} /></TableCell>
                        <TableCell>{line.description || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-right"><DecimalDisplay value={line.debitAmount} /></TableCell>
                        <TableCell className="text-right"><DecimalDisplay value={line.creditAmount} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          {canReadLedger ? <AccountBalanceCard account={account} balance={balanceQuery.data} /> : <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Current balance</CardTitle><CardDescription>You need ledger.read to view backend-calculated balances.</CardDescription></CardHeader></Card> }
        </div>
      </div>

      <AccountFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        account={account}
        parentOptions={accountsQuery.data ?? []}
        onSubmit={handleUpdate}
        isSubmitting={updateMutation.isPending}
      />

      <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive account</DialogTitle>
            <DialogDescription>Archiving removes the account from future selection. Accounts with non-zero balances or system protections may be rejected by the backend.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void handleArchive()} disabled={archiveMutation.isPending}>{archiveMutation.isPending ? "Archiving…" : "Archive account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
