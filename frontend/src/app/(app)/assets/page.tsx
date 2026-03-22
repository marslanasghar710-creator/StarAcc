"use client";

import * as React from "react";
import Link from "next/link";
import { FolderTree, Play, Plus, Warehouse } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { DecimalDisplay } from "@/components/shared/decimal-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetDepreciationSummaryCard } from "@/features/assets/components/asset-depreciation-summary-card";
import { AssetFormDialog } from "@/features/assets/components/asset-form-dialog";
import { AssetRegisterTable } from "@/features/assets/components/asset-register-table";
import { AssetValuationCard } from "@/features/assets/components/asset-valuation-card";
import { DepreciationRunDialog } from "@/features/assets/components/depreciation-run-dialog";
import { DepreciationRunListTable } from "@/features/assets/components/depreciation-run-list-table";
import {
  useAssetCategories,
  useAssetDepreciationSummary,
  useAssetRegister,
  useAssetValuation,
  useCreateAsset,
  useDepreciationRuns,
  useRunDepreciation,
} from "@/features/assets/hooks";
import { type AssetFormValues, type DepreciationRunFormValues } from "@/features/assets/schemas";
import type { AssetMutationPayload } from "@/features/assets/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toAssetPayload(values: AssetFormValues): AssetMutationPayload {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    asset_category_id: values.asset_category_id || null,
    acquisition_date: values.acquisition_date,
    acquisition_cost: values.acquisition_cost.trim(),
    useful_life_months: values.useful_life_months ? Number(values.useful_life_months) : null,
    depreciation_method: values.depreciation_method,
    residual_value: values.residual_value?.trim() || null,
    depreciation_start_date: values.depreciation_start_date,
  };
}

export default function AssetsPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("assets.read");
  const canCreate = can("assets.create");
  const canRunDepreciation = can("depreciation.run");
  const canManageCategories = can("asset_categories.manage");
  const [search, setSearch] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isRunOpen, setIsRunOpen] = React.useState(false);

  const registerQuery = useAssetRegister(currentOrganizationId ?? undefined, canRead);
  const categoriesQuery = useAssetCategories(currentOrganizationId ?? undefined, canRead);
  const valuationQuery = useAssetValuation(currentOrganizationId ?? undefined, canRead);
  const depreciationSummaryQuery = useAssetDepreciationSummary(currentOrganizationId ?? undefined, canRead);
  const depreciationRunsQuery = useDepreciationRuns(currentOrganizationId ?? undefined, canRead);
  const createAssetMutation = useCreateAsset(currentOrganizationId ?? undefined);
  const runDepreciationMutation = useRunDepreciation(currentOrganizationId ?? undefined);

  const filteredRegister = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = registerQuery.data ?? [];
    if (!term) {
      return rows;
    }

    return rows.filter((row) => [row.name, row.categoryName, row.status, row.depreciationMethod].some((value) => value?.toLowerCase().includes(term)));
  }, [registerQuery.data, search]);

  const categoryOptions = React.useMemo(
    () => (categoriesQuery.data ?? []).map((category) => ({ label: category.name, value: category.id })),
    [categoriesQuery.data],
  );

  async function handleCreateAsset(values: AssetFormValues) {
    const created = await createAssetMutation.mutateAsync(toAssetPayload(values));
    toast.success(`Created fixed asset ${created.name}`);
  }

  async function handleRunDepreciation(values: DepreciationRunFormValues) {
    const run = await runDepreciationMutation.mutateAsync({ through_date: values.through_date });
    toast.success(`Started depreciation run ${run.id}`);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading fixed assets" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening fixed assets." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need assets.read to view the asset register, valuation, and depreciation schedules." />;
  }

  const registerRows = registerQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Fixed assets"}
        title="Fixed assets"
        description="Review the backend-managed fixed asset register, valuation, and depreciation activity without calculating accounting truth in the frontend."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManageCategories ? (
              <Button asChild variant="outline">
                <Link href="/assets/categories"><FolderTree className="size-4" />Categories</Link>
              </Button>
            ) : null}
            {canRunDepreciation ? <Button variant="outline" onClick={() => setIsRunOpen(true)}><Play className="size-4" />Run depreciation</Button> : null}
            {canCreate ? <Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4" />New asset</Button> : null}
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <AssetValuationCard valuation={valuationQuery.data} currencyCode={currentOrganization?.base_currency} />
        <AssetDepreciationSummaryCard summary={depreciationSummaryQuery.data} currencyCode={currentOrganization?.base_currency} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Asset register</CardTitle>
            <CardDescription>Current register footprint from the backend asset-register endpoint.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Assets</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{registerRows.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active assets</p>
              <p className="mt-1 text-lg font-semibold tabular-nums"><DecimalDisplay value={valuationQuery.data?.activeAssetCount ?? 0} /></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disposed assets</p>
              <p className="mt-1 text-lg font-semibold tabular-nums"><DecimalDisplay value={valuationQuery.data?.disposedAssetCount ?? 0} /></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Category coverage</CardTitle>
            <CardDescription>Categories provide default lives, methods, and account mappings for new assets.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums">{(categoriesQuery.data ?? []).length}</p>
            <p className="text-sm text-muted-foreground">Configured asset categories in the active organization.</p>
          </CardContent>
        </Card>
      </div>

      <PageActionBar
        left={<Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assets by name, category, status, or method" className="max-w-md" />}
        right={<p className="text-sm text-muted-foreground">Backend register rows remain the source of truth for book values and status.</p>}
      />

      {registerQuery.isLoading || valuationQuery.isLoading || depreciationSummaryQuery.isLoading ? <LoadingScreen label="Loading fixed assets" /> : null}
      {registerQuery.isError ? <ErrorState description="We couldn't load the fixed asset register." onRetry={() => void registerQuery.refetch()} /> : null}
      {valuationQuery.isError ? <ErrorState description="We couldn't load asset valuation totals." onRetry={() => void valuationQuery.refetch()} /> : null}
      {depreciationSummaryQuery.isError ? <ErrorState description="We couldn't load the depreciation summary." onRetry={() => void depreciationSummaryQuery.refetch()} /> : null}

      {!registerQuery.isLoading && !registerQuery.isError && filteredRegister.length === 0 ? (
        <EmptyState
          title={search ? "No matching fixed assets" : "No fixed assets yet"}
          description={search ? "Try a broader search term to find the asset you need." : "Create the first fixed asset to start tracking the register, schedules, and valuation."}
          action={canCreate ? <Button onClick={() => setIsCreateOpen(true)}><Warehouse className="size-4" />Create fixed asset</Button> : undefined}
        />
      ) : null}

      {!registerQuery.isLoading && !registerQuery.isError && filteredRegister.length > 0 ? (
        <Tabs defaultValue="register" className="space-y-4">
          <TabsList>
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="runs">Depreciation runs</TabsTrigger>
          </TabsList>
          <TabsContent value="register">
            <AssetRegisterTable rows={filteredRegister} currencyCode={currentOrganization?.base_currency} />
          </TabsContent>
          <TabsContent value="runs" className="space-y-4">
            {depreciationRunsQuery.isLoading ? <LoadingScreen label="Loading depreciation runs" /> : null}
            {depreciationRunsQuery.isError ? <ErrorState description="We couldn't load depreciation runs." onRetry={() => void depreciationRunsQuery.refetch()} /> : null}
            {!depreciationRunsQuery.isLoading && !depreciationRunsQuery.isError && (depreciationRunsQuery.data?.length ?? 0) === 0 ? (
              <EmptyState title="No depreciation runs yet" description="Run depreciation from this page once the backend is ready to process the current period." />
            ) : null}
            {!depreciationRunsQuery.isLoading && !depreciationRunsQuery.isError && (depreciationRunsQuery.data?.length ?? 0) > 0 ? (
              <DepreciationRunListTable runs={depreciationRunsQuery.data ?? []} currencyCode={currentOrganization?.base_currency} />
            ) : null}
          </TabsContent>
        </Tabs>
      ) : null}

      <AssetFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateAsset}
        isSubmitting={createAssetMutation.isPending}
        categoryOptions={categoryOptions}
      />

      <DepreciationRunDialog
        open={isRunOpen}
        onOpenChange={setIsRunOpen}
        onSubmit={handleRunDepreciation}
        isSubmitting={runDepreciationMutation.isPending}
      />
    </div>
  );
}
