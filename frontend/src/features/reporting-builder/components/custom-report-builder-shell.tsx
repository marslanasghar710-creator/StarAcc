"use client";

import * as React from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ReportBuilderEmptyState } from "@/features/reporting-builder/components/report-builder-empty-state";
import { DatasetSelector } from "@/features/reporting-builder/components/dataset-selector";
import { FieldPicker } from "@/features/reporting-builder/components/field-picker";
import { FilterBuilder } from "@/features/reporting-builder/components/filter-builder";
import { GroupingBuilder } from "@/features/reporting-builder/components/grouping-builder";
import { ReportExportActions } from "@/features/reporting-builder/components/report-export-actions";
import { ReportPreviewTable } from "@/features/reporting-builder/components/report-preview-table";
import { ReportResultSummary } from "@/features/reporting-builder/components/report-result-summary";
import { SavedReportFormDialog } from "@/features/reporting-builder/components/saved-report-form-dialog";
import { SortingBuilder } from "@/features/reporting-builder/components/sorting-builder";
import {
  useCreateCustomReport,
  useCustomReportDataset,
  useCustomReportPreview,
  useDeleteCustomReport,
  useExportCustomReport,
  useExportPreviewCustomReport,
  useRunCustomReport,
  useUpdateCustomReport,
} from "@/features/reporting-builder/hooks";
import { customReportDefinitionSchema } from "@/features/reporting-builder/schemas";
import type { CustomReportDatasetSummary, SavedCustomReport } from "@/features/reporting-builder/types";

function toDefinitionState(report?: SavedCustomReport) {
  return {
    datasetId: report?.datasetId ?? "",
    columns: report?.columns ?? [],
    filters: report?.filters ?? [],
    groupings: report?.groupings ?? [],
    sorting: report?.sorting ?? [],
    displayOptions: report?.displayOptions ?? { visibility: report?.visibility ?? "private" },
    page: 1,
    pageSize: 50,
  };
}

export function CustomReportBuilderShell({ organizationId, datasets, report }: { organizationId: string; datasets: CustomReportDatasetSummary[]; report?: SavedCustomReport }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState(() => toDefinitionState(report));
  const previewMutation = useCustomReportPreview(organizationId);
  const createMutation = useCreateCustomReport(organizationId);
  const updateMutation = useUpdateCustomReport(organizationId, report?.id);
  const deleteMutation = useDeleteCustomReport(organizationId);
  const runMutation = useRunCustomReport(organizationId);
  const exportPreviewMutation = useExportPreviewCustomReport(organizationId);
  const exportSavedMutation = useExportCustomReport(organizationId, report?.id);
  const datasetQuery = useCustomReportDataset(organizationId, draft.datasetId || undefined, Boolean(draft.datasetId));

  React.useEffect(() => {
    setDraft(toDefinitionState(report));
  }, [report]);

  React.useEffect(() => {
    const dataset = datasetQuery.data;
    if (!dataset) return;
    setDraft((current) => {
      const nextColumns = current.columns.filter((column) => dataset.fields.some((field) => field.key === column));
      const resolvedColumns = nextColumns.length ? nextColumns : dataset.defaultColumns;
      return {
        ...current,
        columns: resolvedColumns,
        groupings: current.groupings.filter((field) => dataset.supportedGroupings.some((entry) => entry.key === field)),
        sorting: current.sorting.filter((sort) => dataset.fields.some((field) => field.key === sort.field)),
        filters: current.filters.filter((filter) => dataset.supportedFilters.some((field) => field.key === filter.field)),
      };
    });
  }, [datasetQuery.data]);

  const selectedDataset = datasetQuery.data;
  const fields = selectedDataset?.fields ?? [];
  const previewResult = previewMutation.data ?? (runMutation.data ?? null);
  const validation = customReportDefinitionSchema.safeParse({
    datasetId: draft.datasetId,
    columns: draft.columns,
    filters: draft.filters,
    groupings: draft.groupings,
    sorting: draft.sorting,
    displayOptions: draft.displayOptions,
  });

  const handlePreview = async () => {
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Report configuration is invalid.");
      return;
    }
    try {
      await previewMutation.mutateAsync(draft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Preview failed.");
    }
  };

  const handleSave = async ({ name, description, visibility }: { name: string; description: string; visibility: "private" | "organization" }) => {
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Report configuration is invalid.");
      return;
    }
    try {
      if (report) {
        const updated = await updateMutation.mutateAsync({
          name,
          description,
          datasetId: draft.datasetId,
          columns: draft.columns,
          filters: draft.filters,
          groupings: draft.groupings,
          sorting: draft.sorting,
          displayOptions: { visibility },
        });
        toast.success("Custom report updated.");
        router.replace(`/reports/custom/${updated.id}`);
        return;
      }
      const created = await createMutation.mutateAsync({
        name,
        description,
        datasetId: draft.datasetId,
        columns: draft.columns,
        filters: draft.filters,
        groupings: draft.groupings,
        sorting: draft.sorting,
        displayOptions: { visibility },
      });
      toast.success("Custom report saved.");
      router.push(`/reports/custom/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed.");
    }
  };

  const handleRunSaved = async () => {
    if (!report) return;
    try {
      await runMutation.mutateAsync(report.id);
      toast.success("Saved report executed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Run failed.");
    }
  };

  const handleDelete = async () => {
    if (!report) return;
    try {
      await deleteMutation.mutateAsync(report.id);
      toast.success("Custom report deleted.");
      router.push("/reports/custom");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      if (report) {
        await exportSavedMutation.mutateAsync({ input: draft, format });
      } else {
        await exportPreviewMutation.mutateAsync({ input: draft, format });
      }
      toast.success(`Export ${format.toUpperCase()} started.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{report ? "Edit report" : "Build report"}</CardTitle>
            <CardDescription>Choose an authoritative dataset, then configure columns, filters, grouping, and sorting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DatasetSelector datasets={datasets} value={draft.datasetId} onChange={(datasetId) => setDraft((current) => ({ ...current, datasetId }))} />
            <Separator />
            {selectedDataset ? <FieldPicker fields={fields} selected={draft.columns} onToggle={(fieldKey) => setDraft((current) => ({ ...current, columns: current.columns.includes(fieldKey) ? current.columns.filter((entry) => entry !== fieldKey) : [...current.columns, fieldKey] }))} /> : <ReportBuilderEmptyState title="Pick a dataset" description="Dataset metadata unlocks fields, filters, grouping rules, and preview execution." />}
          </CardContent>
        </Card>

        {selectedDataset ? (
          <Card>
            <CardContent className="space-y-5 pt-6">
              <FilterBuilder fields={selectedDataset.supportedFilters} filters={draft.filters} onChange={(filters) => setDraft((current) => ({ ...current, filters }))} />
              <Separator />
              <GroupingBuilder fields={selectedDataset.supportedGroupings} groupings={draft.groupings} onChange={(groupings) => setDraft((current) => ({ ...current, groupings }))} />
              <Separator />
              <SortingBuilder fields={fields.filter((field) => field.sortable)} sorting={draft.sorting} onChange={(sorting) => setDraft((current) => ({ ...current, sorting }))} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{report?.name || "Preview"}</CardTitle>
              <CardDescription>{report?.description || "Execute an authoritative backend preview before saving or exporting."}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={handlePreview} disabled={!draft.datasetId || previewMutation.isPending}>Preview</Button>
              <SavedReportFormDialog triggerLabel={report ? "Update" : "Save"} initialName={report?.name ?? ""} initialDescription={report?.description ?? ""} initialVisibility={report?.visibility ?? "private"} onSubmit={handleSave} />
              {report ? <Button type="button" variant="outline" onClick={handleRunSaved} disabled={runMutation.isPending}>Run saved</Button> : null}
              {report ? <Button type="button" variant="ghost" onClick={handleDelete} disabled={deleteMutation.isPending}>Delete</Button> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReportExportActions canExport={Boolean(validation.success)} isExporting={exportPreviewMutation.isPending || exportSavedMutation.isPending} onExport={handleExport} />
            {previewResult ? <ReportResultSummary result={previewResult} /> : null}
          </div>
          {!draft.datasetId ? <ReportBuilderEmptyState title="No dataset selected" description="Select a dataset to unlock report metadata and preview controls." /> : null}
          {draft.datasetId && !previewResult && !previewMutation.isPending && !runMutation.isPending ? <ReportBuilderEmptyState title="No preview yet" description="Use Preview to fetch paginated results, totals, and filter context from the backend." /> : null}
          {previewMutation.isPending || runMutation.isPending ? <div className="rounded-xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground">Executing report preview…</div> : null}
          {previewResult ? <>
            {previewResult.filterSummary.length ? <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">Filters: {previewResult.filterSummary.join(" · ")}</div> : null}
            <ReportPreviewTable result={previewResult} />
          </> : null}
        </CardContent>
      </Card>
    </div>
  );
}
