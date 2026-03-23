import { apiClient } from "@/lib/api/client";
import { ApiError, normalizeApiError } from "@/lib/api/errors";
import { getAccessTokenValue } from "@/lib/auth/session";
import { clientEnv } from "@/lib/env/client";

import type {
  CustomReportDataset,
  CustomReportDatasetSummary,
  CustomReportExportFormat,
  CustomReportPreviewInput,
  CustomReportResult,
  SavedCustomReport,
} from "@/features/reporting-builder/types";

function normalizeField(raw: Record<string, unknown>) {
  return {
    key: String(raw.key ?? ""),
    label: String(raw.label ?? raw.key ?? "Field"),
    description: typeof raw.description === "string" ? raw.description : null,
    dataType: String(raw.data_type ?? raw.dataType ?? "string") as CustomReportDataset["fields"][number]["dataType"],
    kind: String(raw.kind ?? "dimension") as CustomReportDataset["fields"][number]["kind"],
    filterOperators: Array.isArray(raw.filter_operators) ? raw.filter_operators.map(String) : [],
    sortable: Boolean(raw.sortable ?? true),
    groupable: Boolean(raw.groupable ?? true),
    aggregations: Array.isArray(raw.aggregations) ? raw.aggregations.map(String) : [],
    options: Array.isArray(raw.options)
      ? raw.options.map((option) => ({ value: String((option as Record<string, unknown>).value ?? ""), label: String((option as Record<string, unknown>).label ?? "") }))
      : [],
  };
}

function normalizeDatasetSummary(raw: Record<string, unknown>): CustomReportDatasetSummary {
  return {
    id: String(raw.id ?? raw.key ?? ""),
    key: String(raw.key ?? raw.id ?? ""),
    name: String(raw.name ?? raw.title ?? "Dataset"),
    description: typeof raw.description === "string" ? raw.description : null,
    requiredPermissions: Array.isArray(raw.required_permissions) ? raw.required_permissions.map(String) : [],
    defaultColumns: Array.isArray(raw.default_columns) ? raw.default_columns.map(String) : [],
  };
}

function normalizeDataset(payload: unknown): CustomReportDataset {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  return {
    ...normalizeDatasetSummary(raw),
    fields: Array.isArray(raw.fields) ? raw.fields.map((field) => normalizeField(field as Record<string, unknown>)) : [],
    supportedFilters: Array.isArray(raw.supported_filters) ? raw.supported_filters.map((field) => normalizeField(field as Record<string, unknown>)) : [],
    supportedGroupings: Array.isArray(raw.supported_groupings) ? raw.supported_groupings.map((field) => normalizeField(field as Record<string, unknown>)) : [],
  };
}

function normalizeSavedReport(payload: unknown): SavedCustomReport {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  return {
    id: String(raw.id ?? ""),
    organizationId: String(raw.organization_id ?? raw.organizationId ?? ""),
    name: String(raw.name ?? "Untitled report"),
    description: typeof raw.description === "string" ? raw.description : null,
    datasetId: String(raw.dataset_id ?? raw.datasetId ?? ""),
    columns: Array.isArray(raw.columns_json) ? raw.columns_json.map(String) : [],
    filters: Array.isArray(raw.filters_json) ? raw.filters_json.map((item) => item as SavedCustomReport["filters"][number]) : [],
    groupings: Array.isArray(raw.groupings_json) ? raw.groupings_json.map(String) : [],
    sorting: Array.isArray(raw.sorting_json) ? raw.sorting_json.map((item) => item as SavedCustomReport["sorting"][number]) : [],
    displayOptions: raw.display_options_json && typeof raw.display_options_json === "object" ? raw.display_options_json as SavedCustomReport["displayOptions"] : null,
    isSystemTemplate: Boolean(raw.is_system_template),
    createdByUserId: typeof raw.created_by_user_id === "string" ? raw.created_by_user_id : null,
    createdByEmail: typeof raw.created_by_email === "string" ? raw.created_by_email : null,
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
    archivedAt: typeof raw.archived_at === "string" ? raw.archived_at : null,
    lastRunAt: typeof raw.last_run_at === "string" ? raw.last_run_at : null,
    lastRunStatus: typeof raw.last_run_status === "string" ? raw.last_run_status : null,
    lastRunByUserId: typeof raw.last_run_by_user_id === "string" ? raw.last_run_by_user_id : null,
    lastRunByEmail: typeof raw.last_run_by_email === "string" ? raw.last_run_by_email : null,
    visibility: String(raw.visibility ?? "private") as SavedCustomReport["visibility"],
    validationErrors: Array.isArray(raw.validation_errors) ? raw.validation_errors.map(String) : [],
  };
}

function normalizeResult(payload: unknown): CustomReportResult {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  return {
    reportDefinitionId: typeof raw.report_definition_id === "string" ? raw.report_definition_id : null,
    dataset: normalizeDatasetSummary((raw.dataset as Record<string, unknown>) ?? {}),
    columns: Array.isArray(raw.columns) ? raw.columns.map((field) => normalizeField(field as Record<string, unknown>)) : [],
    filters: Array.isArray(raw.filters) ? raw.filters as CustomReportResult["filters"] : [],
    filterSummary: Array.isArray(raw.filter_summary) ? raw.filter_summary.map(String) : [],
    groupings: Array.isArray(raw.groupings) ? raw.groupings.map((field) => normalizeField(field as Record<string, unknown>)) : [],
    sorting: Array.isArray(raw.sorting) ? raw.sorting as CustomReportResult["sorting"] : [],
    rows: Array.isArray(raw.rows) ? raw.rows as CustomReportResult["rows"] : [],
    totals: raw.totals && typeof raw.totals === "object" ? raw.totals as Record<string, unknown> : null,
    rowCount: Number(raw.row_count ?? 0),
    page: Number(raw.page ?? 1),
    pageSize: Number(raw.page_size ?? 50),
    totalPages: Number(raw.total_pages ?? 1),
    validationErrors: Array.isArray(raw.validation_errors) ? raw.validation_errors.map(String) : [],
    execution: {
      executionId: typeof (raw.execution as Record<string, unknown> | undefined)?.execution_id === "string" ? String((raw.execution as Record<string, unknown>).execution_id) : null,
      status: String((raw.execution as Record<string, unknown> | undefined)?.status ?? "completed"),
      executedAt: String((raw.execution as Record<string, unknown> | undefined)?.executed_at ?? ""),
      completedAt: typeof (raw.execution as Record<string, unknown> | undefined)?.completed_at === "string" ? String((raw.execution as Record<string, unknown>).completed_at) : null,
      requestedByUserId: typeof (raw.execution as Record<string, unknown> | undefined)?.requested_by_user_id === "string" ? String((raw.execution as Record<string, unknown>).requested_by_user_id) : null,
      requestedByEmail: typeof (raw.execution as Record<string, unknown> | undefined)?.requested_by_email === "string" ? String((raw.execution as Record<string, unknown>).requested_by_email) : null,
      reportDefinitionId: typeof (raw.execution as Record<string, unknown> | undefined)?.report_definition_id === "string" ? String((raw.execution as Record<string, unknown>).report_definition_id) : null,
    },
  };
}

function toApiPayload(input: CustomReportPreviewInput | (Omit<CustomReportPreviewInput, "page" | "pageSize"> & { page?: number; pageSize?: number })) {
  return {
    dataset_id: input.datasetId,
    columns: input.columns,
    filters: input.filters,
    groupings: input.groupings,
    sorting: input.sorting,
    display_options: input.displayOptions ?? undefined,
    page: input.page ?? 1,
    page_size: input.pageSize ?? 50,
  };
}

async function downloadReport(path: string, body: Record<string, unknown>, format: CustomReportExportFormat) {
  const token = getAccessTokenValue();
  const response = await fetch(`${clientEnv.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: format === "csv" ? "text/csv,application/octet-stream" : "application/pdf,application/octet-stream",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!response.ok) {
    throw await normalizeApiError(response);
  }

  const blob = await response.blob();
  const filename = response.headers.get("content-disposition")?.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i)?.[1]?.replace(/"/g, "") ?? `custom-report.${format}`;
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = decodeURIComponent(filename);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
  return { filename: decodeURIComponent(filename), format };
}

export async function getCustomReportDatasets(organizationId: string): Promise<CustomReportDatasetSummary[]> {
  const response = await apiClient<unknown[]>(`/organizations/${organizationId}/custom-reports/datasets`);
  return response.map((item) => normalizeDatasetSummary((item ?? {}) as Record<string, unknown>));
}

export async function getCustomReportDataset(organizationId: string, datasetId: string): Promise<CustomReportDataset> {
  const response = await apiClient<unknown>(`/organizations/${organizationId}/custom-reports/datasets/${datasetId}`);
  return normalizeDataset(response);
}

export async function getCustomReports(organizationId: string): Promise<SavedCustomReport[]> {
  const response = await apiClient<{ items?: unknown[] }>(`/organizations/${organizationId}/custom-reports`);
  return Array.isArray(response.items) ? response.items.map(normalizeSavedReport) : [];
}

export async function getCustomReport(organizationId: string, reportId: string): Promise<SavedCustomReport> {
  return normalizeSavedReport(await apiClient<unknown>(`/organizations/${organizationId}/custom-reports/${reportId}`));
}

export async function createCustomReport(organizationId: string, input: { name: string; description?: string | null } & Omit<CustomReportPreviewInput, "page" | "pageSize">) {
  return normalizeSavedReport(
    await apiClient<unknown>(`/organizations/${organizationId}/custom-reports`, {
      method: "POST",
      body: {
        name: input.name,
        description: input.description ?? null,
        dataset_id: input.datasetId,
        columns: input.columns,
        filters: input.filters,
        groupings: input.groupings,
        sorting: input.sorting,
        display_options: input.displayOptions ?? undefined,
      },
    }),
  );
}

export async function updateCustomReport(organizationId: string, reportId: string, input: Partial<{ name: string; description: string | null }> & Partial<Omit<CustomReportPreviewInput, "page" | "pageSize">>) {
  return normalizeSavedReport(
    await apiClient<unknown>(`/organizations/${organizationId}/custom-reports/${reportId}`, {
      method: "PATCH",
      body: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.datasetId !== undefined ? { dataset_id: input.datasetId } : {}),
        ...(input.columns !== undefined ? { columns: input.columns } : {}),
        ...(input.filters !== undefined ? { filters: input.filters } : {}),
        ...(input.groupings !== undefined ? { groupings: input.groupings } : {}),
        ...(input.sorting !== undefined ? { sorting: input.sorting } : {}),
        ...(input.displayOptions !== undefined ? { display_options: input.displayOptions } : {}),
      },
    }),
  );
}

export async function deleteCustomReport(organizationId: string, reportId: string) {
  await apiClient<void>(`/organizations/${organizationId}/custom-reports/${reportId}`, { method: "DELETE" });
}

export async function previewCustomReport(organizationId: string, input: CustomReportPreviewInput): Promise<CustomReportResult> {
  return normalizeResult(await apiClient<unknown>(`/organizations/${organizationId}/custom-reports/preview`, { method: "POST", body: toApiPayload(input) }));
}

export async function runCustomReport(organizationId: string, reportId: string): Promise<CustomReportResult> {
  return normalizeResult(await apiClient<unknown>(`/organizations/${organizationId}/custom-reports/${reportId}/run`, { method: "POST" }));
}

export async function getCustomReportResults(organizationId: string, reportId: string): Promise<CustomReportResult> {
  return normalizeResult(await apiClient<unknown>(`/organizations/${organizationId}/custom-reports/${reportId}/results`));
}

export async function exportCustomReportPreview(organizationId: string, input: CustomReportPreviewInput, format: CustomReportExportFormat) {
  return downloadReport(`/organizations/${organizationId}/custom-reports/preview/export`, { ...toApiPayload(input), export_format: format }, format);
}

export async function exportCustomReport(organizationId: string, reportId: string, input: CustomReportPreviewInput, format: CustomReportExportFormat) {
  return downloadReport(`/organizations/${organizationId}/custom-reports/${reportId}/export`, { ...toApiPayload(input), export_format: format }, format);
}
