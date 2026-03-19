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
import { AccountFilters } from "@/features/accounts/components/account-filters";
import { AccountFormDialog } from "@/features/accounts/components/account-form-dialog";
import { AccountListTable } from "@/features/accounts/components/account-list-table";
import { type AccountFormValues } from "@/features/accounts/schemas";
import { useAccounts, useCreateAccount } from "@/features/accounts/hooks";
import type { AccountListFilters } from "@/features/accounts/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: AccountFormValues) {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description?.trim() || null,
    account_type: values.account_type,
    account_subtype: values.account_subtype?.trim() || null,
    parent_account_id: values.parent_account_id || null,
    currency_code: values.currency_code?.trim().toUpperCase() || null,
    is_postable: values.is_postable,
    is_active: values.is_active,
  };
}

export default function AccountsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("accounts.read");
  const canCreate = can("accounts.create");
  const [filters, setFilters] = React.useState<AccountListFilters>({ search: "", accountType: "all", status: "all" });
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const accountsQuery = useAccounts(currentOrganizationId, filters.search, canRead);
  const createAccountMutation = useCreateAccount(currentOrganizationId ?? undefined);

  const filteredAccounts = React.useMemo(() => {
    const items = accountsQuery.data ?? [];
    return items.filter((account) => {
      const matchesType = !filters.accountType || filters.accountType === "all" ? true : account.accountType === filters.accountType;
      const matchesStatus = !filters.status || filters.status === "all" ? true : filters.status === "active" ? account.isActive : !account.isActive;
      return matchesType && matchesStatus;
    });
  }, [accountsQuery.data, filters.accountType, filters.status]);

  async function handleCreate(values: AccountFormValues) {
    const account = await createAccountMutation.mutateAsync(toPayload(values));
    toast.success(`Created account ${account.code}`);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading chart of accounts" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening the chart of accounts." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need accounts.read to view the chart of accounts." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Accounting"}
        title="Chart of Accounts"
        description="Search, review, and maintain the general ledger structure for the active organization."
        actions={canCreate ? <Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4" />New account</Button> : null}
      />

      <PageActionBar left={<AccountFilters filters={filters} onChange={setFilters} />} />

      {accountsQuery.isLoading ? <LoadingScreen label="Loading accounts" /> : null}
      {accountsQuery.isError ? <ErrorState description="We couldn't load the chart of accounts for this organization." onRetry={() => void accountsQuery.refetch()} /> : null}
      {!accountsQuery.isLoading && !accountsQuery.isError && filteredAccounts.length === 0 ? (
        <EmptyState
          title={filters.search || filters.accountType !== "all" || filters.status !== "all" ? "No matching accounts" : "No accounts yet"}
          description={filters.search || filters.accountType !== "all" || filters.status !== "all" ? "Try changing the search or filters to find the account you need." : "Create the first ledger account to start structuring the chart of accounts."}
          action={canCreate ? <Button onClick={() => setIsCreateOpen(true)}>Create account</Button> : undefined}
        />
      ) : null}
      {!accountsQuery.isLoading && !accountsQuery.isError && filteredAccounts.length > 0 ? <AccountListTable accounts={filteredAccounts} /> : null}

      <AccountFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        parentOptions={accountsQuery.data ?? []}
        onSubmit={handleCreate}
        isSubmitting={createAccountMutation.isPending}
      />
    </div>
  );
}
