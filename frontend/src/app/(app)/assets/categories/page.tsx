"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccounts } from "@/features/accounts/hooks";
import { AssetCategoryDeleteDialog } from "@/features/assets/components/asset-category-delete-dialog";
import { AssetCategoryFormDialog } from "@/features/assets/components/asset-category-form-dialog";
import { AssetCategoryListTable } from "@/features/assets/components/asset-category-list-table";
import { useAssetCategories, useCreateAssetCategory, useDeleteAssetCategory, useUpdateAssetCategory } from "@/features/assets/hooks";
import { type AssetCategoryFormValues } from "@/features/assets/schemas";
import type { AssetCategory, AssetCategoryMutationPayload } from "@/features/assets/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toPayload(values: AssetCategoryFormValues): AssetCategoryMutationPayload {
  return {
    name: values.name.trim(),
    default_useful_life_months: values.default_useful_life_months ? Number(values.default_useful_life_months) : null,
    depreciation_method: values.depreciation_method,
    asset_account_id: values.asset_account_id || null,
    accumulated_depreciation_account_id: values.accumulated_depreciation_account_id || null,
    depreciation_expense_account_id: values.depreciation_expense_account_id || null,
  };
}

export default function AssetCategoriesPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canManage = can("asset_categories.manage");
  const canReadAccounts = can("accounts.read");
  const [search, setSearch] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<AssetCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<AssetCategory | null>(null);

  const categoriesQuery = useAssetCategories(currentOrganizationId ?? undefined, canManage);
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", canReadAccounts);
  const createCategoryMutation = useCreateAssetCategory(currentOrganizationId ?? undefined);
  const updateCategoryMutation = useUpdateAssetCategory(currentOrganizationId ?? undefined, editingCategory?.id);
  const deleteCategoryMutation = useDeleteAssetCategory(currentOrganizationId ?? undefined, deletingCategory?.id);

  const filteredCategories = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const categories = categoriesQuery.data ?? [];
    if (!term) {
      return categories;
    }

    return categories.filter((category) => [category.name, category.depreciationMethod].some((value) => value?.toLowerCase().includes(term)));
  }, [categoriesQuery.data, search]);

  const accountOptions = React.useMemo(
    () => (accountsQuery.data ?? []).map((account) => ({ label: `${account.code} · ${account.name}`, value: account.id })),
    [accountsQuery.data],
  );

  const accountNames = React.useMemo(
    () => Object.fromEntries((accountsQuery.data ?? []).map((account) => [account.id, `${account.code} · ${account.name}`])),
    [accountsQuery.data],
  );

  async function handleCreate(values: AssetCategoryFormValues) {
    const created = await createCategoryMutation.mutateAsync(toPayload(values));
    toast.success(`Created asset category ${created.name}`);
  }

  async function handleUpdate(values: AssetCategoryFormValues) {
    const updated = await updateCategoryMutation.mutateAsync(toPayload(values));
    toast.success(`Updated asset category ${updated.name}`);
    setEditingCategory(null);
  }

  async function handleDelete() {
    if (!deletingCategory) {
      return;
    }

    await deleteCategoryMutation.mutateAsync();
    toast.success(`Deleted asset category ${deletingCategory.name}`);
    setDeletingCategory(null);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading asset categories" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening asset categories." />;
  }

  if (!canManage) {
    return <AccessDeniedState description="You need asset_categories.manage to configure fixed asset categories." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Fixed assets"}
        title="Asset categories"
        description="Manage category defaults for useful life, depreciation method, and account mappings used by backend fixed asset workflows."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/assets"><ArrowLeft className="size-4" />Back to assets</Link></Button>
            <Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4" />New category</Button>
          </div>
        }
      />

      <PageActionBar
        left={<Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories by name or depreciation method" className="max-w-md" />}
        right={<p className="text-sm text-muted-foreground">Category defaults reduce setup drift across the asset register.</p>}
      />

      {categoriesQuery.isLoading ? <LoadingScreen label="Loading asset categories" /> : null}
      {categoriesQuery.isError ? <ErrorState description="We couldn't load asset categories." onRetry={() => void categoriesQuery.refetch()} /> : null}
      {!categoriesQuery.isLoading && !categoriesQuery.isError && filteredCategories.length === 0 ? (
        <EmptyState
          title={search ? "No matching asset categories" : "No asset categories yet"}
          description={search ? "Try a broader search term." : "Create the first asset category to define depreciation defaults and account mappings."}
          action={<Button onClick={() => setIsCreateOpen(true)}>Create category</Button>}
        />
      ) : null}
      {!categoriesQuery.isLoading && !categoriesQuery.isError && filteredCategories.length > 0 ? (
        <AssetCategoryListTable categories={filteredCategories} accountNames={accountNames} onEdit={setEditingCategory} onDelete={setDeletingCategory} />
      ) : null}

      <AssetCategoryFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isSubmitting={createCategoryMutation.isPending}
        accountOptions={accountOptions}
      />

      <AssetCategoryFormDialog
        open={Boolean(editingCategory)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCategory(null);
          }
        }}
        category={editingCategory}
        onSubmit={handleUpdate}
        isSubmitting={updateCategoryMutation.isPending}
        accountOptions={accountOptions}
      />

      <AssetCategoryDeleteDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCategory(null);
          }
        }}
        category={deletingCategory}
        onConfirm={handleDelete}
        isSubmitting={deleteCategoryMutation.isPending}
      />
    </div>
  );
}
