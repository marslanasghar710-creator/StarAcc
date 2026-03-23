"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import {
  createCustomReport,
  deleteCustomReport,
  exportCustomReport,
  exportCustomReportPreview,
  getCustomReport,
  getCustomReportDataset,
  getCustomReportDatasets,
  getCustomReportResults,
  getCustomReports,
  previewCustomReport,
  runCustomReport,
  updateCustomReport,
} from "@/features/reporting-builder/api";
import type { CustomReportExportFormat, CustomReportPreviewInput } from "@/features/reporting-builder/types";

export function useCustomReports(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.reportingBuilder.reports(organizationId) : ["reports", "custom", "missing"],
    queryFn: () => getCustomReports(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useCustomReport(organizationId?: string, reportId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && reportId ? queryKeys.reportingBuilder.report(organizationId, reportId) : ["reports", "custom", "missing", "detail"],
    queryFn: () => getCustomReport(organizationId as string, reportId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(reportId),
  });
}

export function useCustomReportDatasets(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.reportingBuilder.datasets(organizationId) : ["reports", "custom", "missing", "datasets"],
    queryFn: () => getCustomReportDatasets(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useCustomReportDataset(organizationId?: string, datasetId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && datasetId ? queryKeys.reportingBuilder.dataset(organizationId, datasetId) : ["reports", "custom", "missing", "dataset"],
    queryFn: () => getCustomReportDataset(organizationId as string, datasetId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(datasetId),
  });
}

export function useCustomReportPreview(organizationId?: string) {
  return useMutation({
    mutationFn: (input: CustomReportPreviewInput) => previewCustomReport(organizationId as string, input),
  });
}

export function useRunCustomReport(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => runCustomReport(organizationId as string, reportId),
    onSuccess: (_, reportId) => {
      if (!organizationId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportingBuilder.reports(organizationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportingBuilder.results(organizationId, reportId) });
    },
  });
}

export function useCustomReportResults(organizationId?: string, reportId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && reportId ? queryKeys.reportingBuilder.results(organizationId, reportId) : ["reports", "custom", "missing", "results"],
    queryFn: () => getCustomReportResults(organizationId as string, reportId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(reportId),
  });
}

export function useCreateCustomReport(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createCustomReport>[1]) => createCustomReport(organizationId as string, input),
    onSuccess: (result) => {
      if (!organizationId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportingBuilder.reports(organizationId) });
      queryClient.setQueryData(queryKeys.reportingBuilder.report(organizationId, result.id), result);
    },
  });
}

export function useUpdateCustomReport(organizationId?: string, reportId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof updateCustomReport>[2]) => updateCustomReport(organizationId as string, reportId as string, input),
    onSuccess: (result) => {
      if (!organizationId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportingBuilder.reports(organizationId) });
      queryClient.setQueryData(queryKeys.reportingBuilder.report(organizationId, result.id), result);
    },
  });
}

export function useDeleteCustomReport(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => deleteCustomReport(organizationId as string, reportId),
    onSuccess: () => {
      if (!organizationId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportingBuilder.reports(organizationId) });
    },
  });
}

export function useExportCustomReport(organizationId?: string, reportId?: string) {
  return useMutation({
    mutationFn: ({ input, format }: { input: CustomReportPreviewInput; format: CustomReportExportFormat }) => exportCustomReport(organizationId as string, reportId as string, input, format),
  });
}

export function useExportPreviewCustomReport(organizationId?: string) {
  return useMutation({
    mutationFn: ({ input, format }: { input: CustomReportPreviewInput; format: CustomReportExportFormat }) => exportCustomReportPreview(organizationId as string, input, format),
  });
}
