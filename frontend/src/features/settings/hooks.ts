"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import {
  archiveTaxCode,
  closeFiscalPeriod,
  createFiscalPeriod,
  createTaxCode,
  getAccountingSettings,
  getDocumentSettings,
  getFiscalPeriod,
  getOrganizationPreferences,
  getTaxCode,
  listFiscalPeriods,
  listTaxCodes,
  reopenFiscalPeriod,
  updateAccountingSettings,
  updateDocumentSettings,
  updateFiscalPeriod,
  updateOrganizationPreferences,
  updateTaxCode,
} from "@/features/settings/api";
import type {
  AccountingSettingsPayload,
  DocumentSettingsPayload,
  FiscalPeriodPayload,
  OrganizationPreferencesPayload,
  TaxCodePayload,
} from "@/features/settings/types";

export function useOrganizationPreferences(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.settings.organization(organizationId) : ["settings", "missing", "organization"],
    queryFn: () => getOrganizationPreferences(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useUpdateOrganizationPreferences(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrganizationPreferencesPayload) => updateOrganizationPreferences(organizationId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.organization(organizationId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(organizationId) });
    },
  });
}

export function useFiscalPeriods(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.settings.fiscalPeriods(organizationId) : ["settings", "missing", "fiscal-periods"],
    queryFn: () => listFiscalPeriods(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useFiscalPeriod(organizationId?: string, periodId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && periodId ? queryKeys.settings.fiscalPeriod(organizationId, periodId) : ["settings", "missing", "fiscal-period"],
    queryFn: () => getFiscalPeriod(organizationId as string, periodId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(periodId),
  });
}

function invalidateFiscalPeriods(queryClient: ReturnType<typeof useQueryClient>, organizationId: string, periodId?: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.fiscalPeriods(organizationId) }),
    periodId ? queryClient.invalidateQueries({ queryKey: queryKeys.settings.fiscalPeriod(organizationId, periodId) }) : Promise.resolve(),
  ]);
}

export function useCreateFiscalPeriod(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FiscalPeriodPayload) => createFiscalPeriod(organizationId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateFiscalPeriods(queryClient, organizationId);
    },
  });
}

export function useUpdateFiscalPeriod(organizationId?: string, periodId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FiscalPeriodPayload) => updateFiscalPeriod(organizationId as string, periodId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateFiscalPeriods(queryClient, organizationId, periodId);
    },
  });
}

export function useCloseFiscalPeriod(organizationId?: string, periodId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => closeFiscalPeriod(organizationId as string, periodId as string),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateFiscalPeriods(queryClient, organizationId, periodId);
    },
  });
}

export function useReopenFiscalPeriod(organizationId?: string, periodId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reopenFiscalPeriod(organizationId as string, periodId as string),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateFiscalPeriods(queryClient, organizationId, periodId);
    },
  });
}

export function useTaxCodes(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.settings.taxCodes(organizationId) : ["settings", "missing", "tax-codes"],
    queryFn: () => listTaxCodes(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useTaxCode(organizationId?: string, taxCodeId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && taxCodeId ? queryKeys.settings.taxCode(organizationId, taxCodeId) : ["settings", "missing", "tax-code"],
    queryFn: () => getTaxCode(organizationId as string, taxCodeId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(taxCodeId),
  });
}

function invalidateTaxCodes(queryClient: ReturnType<typeof useQueryClient>, organizationId: string, taxCodeId?: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.taxCodes(organizationId) }),
    taxCodeId ? queryClient.invalidateQueries({ queryKey: queryKeys.settings.taxCode(organizationId, taxCodeId) }) : Promise.resolve(),
  ]);
}

export function useCreateTaxCode(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaxCodePayload) => createTaxCode(organizationId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateTaxCodes(queryClient, organizationId);
    },
  });
}

export function useUpdateTaxCode(organizationId?: string, taxCodeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaxCodePayload) => updateTaxCode(organizationId as string, taxCodeId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateTaxCodes(queryClient, organizationId, taxCodeId);
    },
  });
}

export function useArchiveTaxCode(organizationId?: string, taxCodeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveTaxCode(organizationId as string, taxCodeId as string),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidateTaxCodes(queryClient, organizationId, taxCodeId);
    },
  });
}

export function useDocumentSettings(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.settings.documentSettings(organizationId) : ["settings", "missing", "document-settings"],
    queryFn: () => getDocumentSettings(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useUpdateDocumentSettings(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DocumentSettingsPayload) => updateDocumentSettings(organizationId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.documentSettings(organizationId) });
    },
  });
}

export function useAccountingSettings(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.settings.accountingSettings(organizationId) : ["settings", "missing", "accounting-settings"],
    queryFn: () => getAccountingSettings(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useUpdateAccountingSettings(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AccountingSettingsPayload) => updateAccountingSettings(organizationId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.accountingSettings(organizationId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.settings(organizationId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.organization(organizationId) });
    },
  });
}
