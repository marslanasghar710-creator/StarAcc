import { apiClient } from "@/lib/api/client";
import { ApiError, normalizeApiError } from "@/lib/api/errors";
import { getAccessTokenValue } from "@/lib/auth/session";
import { clientEnv } from "@/lib/env/client";

import {
  adaptBalanceSheetReport,
  adaptGeneralLedgerReport,
  adaptProfitLossReport,
  adaptReportsMetadata,
  adaptTrialBalanceReport,
} from "@/features/reporting/adapters";
import type {
  BalanceSheetFilterValues,
  GeneralLedgerFilterValues,
  ProfitLossFilterValues,
  TrialBalanceFilterValues,
} from "@/features/reporting/schemas";
import type {
  BalanceSheetReport,
  GeneralLedgerReport,
  ProfitLossReport,
  ReportExportResult,
  ReportFormat,
  ReportsMetadata,
  TrialBalanceReport,
} from "@/features/reporting/types";

function buildQuery(params: Record<string, string | boolean | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    search.set(key, typeof value === "boolean" ? String(value) : value);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

async function optionalReportRequest<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      return fallback;
    }

    throw error;
  }
}

export async function getReportsMetadata(organizationId: string): Promise<ReportsMetadata> {
  try {
    const response = await apiClient<unknown>(`/organizations/${organizationId}/reports/metadata`);
    return adaptReportsMetadata(response);
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  const response = await apiClient<unknown>(`/organizations/${organizationId}/reports`);
  return adaptReportsMetadata(response);
}

export async function getTrialBalance(organizationId: string, filters: TrialBalanceFilterValues): Promise<TrialBalanceReport> {
  const query = buildQuery({
    as_of_date: filters.as_of_date,
    period_id: filters.period_id || null,
    account_type: filters.account_type || null,
    search: filters.search || null,
    include_zero_balances: filters.include_zero_balances,
  });

  const response = await apiClient<unknown>(`/organizations/${organizationId}/reports/trial-balance${query}`);
  return adaptTrialBalanceReport(response);
}

export async function getProfitLoss(organizationId: string, filters: ProfitLossFilterValues): Promise<ProfitLossReport> {
  const query = buildQuery({
    from_date: filters.from_date,
    to_date: filters.to_date,
    period_id: filters.period_id || null,
    comparison_mode: filters.comparison_mode,
    basis: filters.basis || null,
  });

  const response = await apiClient<unknown>(`/organizations/${organizationId}/reports/profit-loss${query}`);
  return adaptProfitLossReport(response);
}

export async function getBalanceSheet(organizationId: string, filters: BalanceSheetFilterValues): Promise<BalanceSheetReport> {
  const query = buildQuery({
    as_of_date: filters.as_of_date,
    period_id: filters.period_id || null,
    comparison_mode: filters.comparison_mode,
  });

  const response = await apiClient<unknown>(`/organizations/${organizationId}/reports/balance-sheet${query}`);
  return adaptBalanceSheetReport(response);
}

export async function getGeneralLedger(organizationId: string, filters: GeneralLedgerFilterValues): Promise<GeneralLedgerReport> {
  const query = buildQuery({
    account_id: filters.account_id,
    from_date: filters.from_date || null,
    to_date: filters.to_date || null,
    journal_reference: filters.journal_reference || null,
    source_module: filters.source_module || null,
    status: filters.status || null,
    cursor: filters.cursor || null,
  });

  const response = await apiClient<unknown>(`/organizations/${organizationId}/reports/general-ledger${query}`);
  return adaptGeneralLedgerReport(response);
}

async function downloadReport(path: string, format: ReportFormat): Promise<ReportExportResult> {
  const token = getAccessTokenValue();
  const response = await fetch(`${clientEnv.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: format === "csv" ? "text/csv,application/octet-stream" : "application/pdf,application/octet-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw await normalizeApiError(response);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  const filenameMatch = disposition?.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1].replace(/"/g, "")) : `report.${format}`;
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);

  return { filename, format };
}

export async function exportTrialBalance(organizationId: string, filters: TrialBalanceFilterValues, format: ReportFormat) {
  const query = buildQuery({
    as_of_date: filters.as_of_date,
    period_id: filters.period_id || null,
    account_type: filters.account_type || null,
    search: filters.search || null,
    include_zero_balances: filters.include_zero_balances,
    format,
  });

  return downloadReport(`/organizations/${organizationId}/reports/trial-balance/export${query}`, format);
}

export async function exportProfitLoss(organizationId: string, filters: ProfitLossFilterValues, format: ReportFormat) {
  const query = buildQuery({
    from_date: filters.from_date,
    to_date: filters.to_date,
    period_id: filters.period_id || null,
    comparison_mode: filters.comparison_mode,
    basis: filters.basis || null,
    format,
  });

  return downloadReport(`/organizations/${organizationId}/reports/profit-loss/export${query}`, format);
}

export async function exportBalanceSheet(organizationId: string, filters: BalanceSheetFilterValues, format: ReportFormat) {
  const query = buildQuery({
    as_of_date: filters.as_of_date,
    period_id: filters.period_id || null,
    comparison_mode: filters.comparison_mode,
    format,
  });

  return downloadReport(`/organizations/${organizationId}/reports/balance-sheet/export${query}`, format);
}

export async function exportGeneralLedger(organizationId: string, filters: GeneralLedgerFilterValues, format: ReportFormat) {
  const query = buildQuery({
    account_id: filters.account_id,
    from_date: filters.from_date || null,
    to_date: filters.to_date || null,
    journal_reference: filters.journal_reference || null,
    source_module: filters.source_module || null,
    status: filters.status || null,
    cursor: filters.cursor || null,
    format,
  });

  return downloadReport(`/organizations/${organizationId}/reports/general-ledger/export${query}`, format);
}

export async function getReportsMetadataOptional(organizationId: string) {
  return optionalReportRequest(getReportsMetadata.bind(null, organizationId), adaptReportsMetadata({}));
}
