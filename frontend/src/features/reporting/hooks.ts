"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import {
  exportBalanceSheet,
  exportGeneralLedger,
  exportProfitLoss,
  exportTrialBalance,
  getBalanceSheet,
  getGeneralLedger,
  getProfitLoss,
  getReportsMetadataOptional,
  getTrialBalance,
} from "@/features/reporting/api";
import type {
  BalanceSheetFilterValues,
  GeneralLedgerFilterValues,
  ProfitLossFilterValues,
  TrialBalanceFilterValues,
} from "@/features/reporting/schemas";
import type { ReportExportResult, ReportFormat } from "@/features/reporting/types";

export function useReportsMetadata(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.reporting.metadata(organizationId) : ["reports", "missing", "metadata"],
    queryFn: () => getReportsMetadataOptional(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useTrialBalance(organizationId: string | undefined, filters: TrialBalanceFilterValues, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.reporting.trialBalance(organizationId, filters) : ["reports", "missing", "trial-balance"],
    queryFn: () => getTrialBalance(organizationId as string, filters),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useProfitLoss(organizationId: string | undefined, filters: ProfitLossFilterValues, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.reporting.profitLoss(organizationId, filters) : ["reports", "missing", "profit-loss"],
    queryFn: () => getProfitLoss(organizationId as string, filters),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useBalanceSheet(organizationId: string | undefined, filters: BalanceSheetFilterValues, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.reporting.balanceSheet(organizationId, filters) : ["reports", "missing", "balance-sheet"],
    queryFn: () => getBalanceSheet(organizationId as string, filters),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useGeneralLedger(organizationId: string | undefined, filters: GeneralLedgerFilterValues, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.reporting.generalLedger(organizationId, filters) : ["reports", "missing", "general-ledger"],
    queryFn: () => getGeneralLedger(organizationId as string, filters),
    enabled: enabled && Boolean(organizationId),
  });
}

function useReportExportMutation<TFilters>(
  organizationId: string | undefined,
  exporter: (organizationId: string, filters: TFilters, format: ReportFormat) => Promise<ReportExportResult>,
) {
  return useMutation({
    mutationFn: ({ filters, format }: { filters: TFilters; format: ReportFormat }) => exporter(organizationId as string, filters, format),
  });
}

export function useExportTrialBalance(organizationId?: string) {
  return useReportExportMutation(organizationId, exportTrialBalance);
}

export function useExportProfitLoss(organizationId?: string) {
  return useReportExportMutation(organizationId, exportProfitLoss);
}

export function useExportBalanceSheet(organizationId?: string) {
  return useReportExportMutation(organizationId, exportBalanceSheet);
}

export function useExportGeneralLedger(organizationId?: string) {
  return useReportExportMutation(organizationId, exportGeneralLedger);
}
