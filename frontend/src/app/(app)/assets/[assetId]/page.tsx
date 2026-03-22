"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetDetailCard } from "@/features/assets/components/asset-detail-card";
import { AssetDisposalDialog } from "@/features/assets/components/asset-disposal-dialog";
import { AssetFormDialog } from "@/features/assets/components/asset-form-dialog";
import { DepreciationScheduleTable } from "@/features/assets/components/depreciation-schedule-table";
import { useAssetCategories, useAsset, useDepreciationSchedule, useDisposeAsset, useGenerateAssetDepreciation, useUpdateAsset } from "@/features/assets/hooks";
import { type AssetDisposalFormValues, type AssetFormValues } from "@/features/assets/schemas";
import type { AssetDisposalPayload, AssetMutationPayload } from "@/features/assets/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toAssetPayload(values: AssetFormValues): Partial<AssetMutationPayload> {
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

function toDisposalPayload(values: AssetDisposalFormValues): AssetDisposalPayload {
  return {
    disposal_date: values.disposal_date,
    disposal_proceeds: values.disposal_proceeds?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

export default function AssetDetailPage() {
  const params = useParams<{ assetId: string }>();
  const assetId = params.assetId;
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("assets.read");
  const canUpdate = can("assets.update");
  const canDispose = can("assets.dispose");
  const canRunDepreciation = can("depreciation.run");
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDisposeOpen, setIsDisposeOpen] = React.useState(false);

  const assetQuery = useAsset(currentOrganizationId ?? undefined, assetId, canRead);
  const scheduleQuery = useDepreciationSchedule(currentOrganizationId ?? undefined, assetId, canRead);
  const categoriesQuery = useAssetCategories(currentOrganizationId ?? undefined, canRead);
  const updateAssetMutation = useUpdateAsset(currentOrganizationId ?? undefined, assetId);
  const disposeAssetMutation = useDisposeAsset(currentOrganizationId ?? undefined, assetId);
  const generateDepreciationMutation = useGenerateAssetDepreciation(currentOrganizationId ?? undefined, assetId);

  const categoryOptions = React.useMemo(
    () => (categoriesQuery.data ?? []).map((category) => ({ label: category.name, value: category.id })),
    [categoriesQuery.data],
  );

  async function handleUpdate(values: AssetFormValues) {
    const updated = await updateAssetMutation.mutateAsync(toAssetPayload(values));
    toast.success(`Updated ${updated.name}`);
  }

  async function handleDispose(values: AssetDisposalFormValues) {
    const disposed = await disposeAssetMutation.mutateAsync(toDisposalPayload(values));
    toast.success(`Disposed ${disposed.name}`);
  }

  async function handleGenerateDepreciation() {
    const generated = await generateDepreciationMutation.mutateAsync();
    toast.success(`Refreshed depreciation data for ${generated.name}`);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading fixed asset" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening fixed assets." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need assets.read to view fixed asset detail and schedules." />;
  }

  if (assetQuery.isLoading) {
    return <LoadingScreen label="Loading fixed asset" />;
  }

  if (assetQuery.isError) {
    return <ErrorState description="We couldn't load this fixed asset." onRetry={() => void assetQuery.refetch()} />;
  }

  const asset = assetQuery.data;

  if (!asset) {
    return <EmptyState title="Fixed asset not found" description="The requested fixed asset could not be found in the active organization." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fixed assets"
        title={asset.name}
        description="Review the backend-managed asset record, depreciation schedule, and disposal state."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/assets"><ArrowLeft className="size-4" />Back to assets</Link></Button>
            {canRunDepreciation ? <Button variant="outline" onClick={() => void handleGenerateDepreciation()} disabled={generateDepreciationMutation.isPending}><Play className="size-4" />{generateDepreciationMutation.isPending ? "Generating…" : "Generate depreciation"}</Button> : null}
            {canUpdate ? <Button onClick={() => setIsEditOpen(true)}><Pencil className="size-4" />Edit asset</Button> : null}
            {canDispose && asset.status !== "disposed" ? <Button variant="destructive" onClick={() => setIsDisposeOpen(true)}><Trash2 className="size-4" />Dispose</Button> : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">
          <AssetDetailCard asset={asset} currencyCode={currentOrganization?.base_currency} />
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Depreciation schedule</CardTitle>
              <CardDescription>The backend remains authoritative for schedule lines, posted periods, and net book value progression.</CardDescription>
            </CardHeader>
            <CardContent>
              {scheduleQuery.isLoading ? <LoadingScreen label="Loading depreciation schedule" /> : null}
              {scheduleQuery.isError ? <ErrorState description="We couldn't load the depreciation schedule." onRetry={() => void scheduleQuery.refetch()} /> : null}
              {!scheduleQuery.isLoading && !scheduleQuery.isError && (scheduleQuery.data?.length ?? 0) === 0 ? (
                <EmptyState title="No depreciation schedule yet" description="Generate depreciation or wait for the backend schedule to appear for this asset." />
              ) : null}
              {!scheduleQuery.isLoading && !scheduleQuery.isError && (scheduleQuery.data?.length ?? 0) > 0 ? (
                <DepreciationScheduleTable lines={scheduleQuery.data ?? []} currencyCode={currentOrganization?.base_currency} />
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Workflow notes</CardTitle>
              <CardDescription>Depreciation and disposal actions call backend workflows instead of recalculating asset accounting in the UI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Asset valuation, schedule generation, and disposal accounting remain backend-owned.</p>
              <p>Use category defaults to keep useful life, method, and accounts consistent for new assets.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <AssetFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        asset={asset}
        onSubmit={handleUpdate}
        isSubmitting={updateAssetMutation.isPending}
        categoryOptions={categoryOptions}
      />

      <AssetDisposalDialog
        open={isDisposeOpen}
        onOpenChange={setIsDisposeOpen}
        asset={asset}
        onSubmit={handleDispose}
        isSubmitting={disposeAssetMutation.isPending}
      />
    </div>
  );
}
