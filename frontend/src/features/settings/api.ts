import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import {
  adaptAccountingSettings,
  adaptDocumentSettings,
  adaptFiscalPeriod,
  adaptOrganizationPreferences,
  adaptTaxCode,
} from "@/features/settings/adapters";
import type {
  AccountingSettingsPayload,
  DocumentSettingsPayload,
  FiscalPeriodPayload,
  OrganizationPreferencesPayload,
  RawFiscalPeriod,
  RawOrganization,
  RawSettings,
  RawTaxCode,
  TaxCodePayload,
} from "@/features/settings/types";

async function optionalRequest<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      return fallback;
    }

    throw error;
  }
}

export async function getOrganizationPreferences(organizationId: string) {
  const [organization, settings] = await Promise.all([
    apiClient<RawOrganization>(`/organizations/${organizationId}`),
    optionalRequest(() => apiClient<RawSettings>(`/organizations/${organizationId}/settings`), {}),
  ]);

  return adaptOrganizationPreferences(organization, settings);
}

export async function updateOrganizationPreferences(organizationId: string, payload: OrganizationPreferencesPayload) {
  const response = await apiClient<RawOrganization>(`/organizations/${organizationId}`, {
    method: "PATCH",
    body: payload,
  });

  return adaptOrganizationPreferences(response);
}

async function listPeriodsFrom(path: string) {
  const response = await apiClient<{ items?: RawFiscalPeriod[] } | RawFiscalPeriod[]>(path);
  const items = Array.isArray(response) ? response : response.items ?? [];
  return items.map(adaptFiscalPeriod);
}

export async function listFiscalPeriods(organizationId: string) {
  try {
    return await listPeriodsFrom(`/organizations/${organizationId}/fiscal-periods`);
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  return listPeriodsFrom(`/organizations/${organizationId}/periods`);
}

export async function getFiscalPeriod(organizationId: string, periodId: string) {
  try {
    const response = await apiClient<RawFiscalPeriod>(`/organizations/${organizationId}/fiscal-periods/${periodId}`);
    return adaptFiscalPeriod(response);
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  const response = await apiClient<RawFiscalPeriod>(`/organizations/${organizationId}/periods/${periodId}`);
  return adaptFiscalPeriod(response);
}

export async function createFiscalPeriod(organizationId: string, payload: FiscalPeriodPayload) {
  try {
    const response = await apiClient<RawFiscalPeriod>(`/organizations/${organizationId}/fiscal-periods`, {
      method: "POST",
      body: payload,
    });
    return adaptFiscalPeriod(response);
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  const response = await apiClient<RawFiscalPeriod>(`/organizations/${organizationId}/periods`, {
    method: "POST",
    body: payload,
  });
  return adaptFiscalPeriod(response);
}

export async function updateFiscalPeriod(organizationId: string, periodId: string, payload: FiscalPeriodPayload) {
  try {
    const response = await apiClient<RawFiscalPeriod>(`/organizations/${organizationId}/fiscal-periods/${periodId}`, {
      method: "PATCH",
      body: payload,
    });
    return adaptFiscalPeriod(response);
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  const response = await apiClient<RawFiscalPeriod>(`/organizations/${organizationId}/periods/${periodId}`, {
    method: "PATCH",
    body: payload,
  });
  return adaptFiscalPeriod(response);
}

async function postPeriodAction(organizationId: string, periodId: string, action: "close" | "reopen") {
  try {
    return await apiClient<{ message?: string }>(`/organizations/${organizationId}/fiscal-periods/${periodId}/${action}`, {
      method: "POST",
    });
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  return apiClient<{ message?: string }>(`/organizations/${organizationId}/periods/${periodId}/${action}`, {
    method: "POST",
  });
}

export function closeFiscalPeriod(organizationId: string, periodId: string) {
  return postPeriodAction(organizationId, periodId, "close");
}

export function reopenFiscalPeriod(organizationId: string, periodId: string) {
  return postPeriodAction(organizationId, periodId, "reopen");
}

export async function listTaxCodes(organizationId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<{ items?: RawTaxCode[] } | RawTaxCode[]>(`/organizations/${organizationId}/tax-codes`);
      const items = Array.isArray(response) ? response : response.items ?? [];
      return items.map(adaptTaxCode);
    },
    null,
  );
}

export async function getTaxCode(organizationId: string, taxCodeId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<RawTaxCode>(`/organizations/${organizationId}/tax-codes/${taxCodeId}`);
      return adaptTaxCode(response);
    },
    null,
  );
}

export async function createTaxCode(organizationId: string, payload: TaxCodePayload) {
  const response = await apiClient<RawTaxCode>(`/organizations/${organizationId}/tax-codes`, {
    method: "POST",
    body: payload,
  });
  return adaptTaxCode(response);
}

export async function updateTaxCode(organizationId: string, taxCodeId: string, payload: TaxCodePayload) {
  const response = await apiClient<RawTaxCode>(`/organizations/${organizationId}/tax-codes/${taxCodeId}`, {
    method: "PATCH",
    body: payload,
  });
  return adaptTaxCode(response);
}

export function archiveTaxCode(organizationId: string, taxCodeId: string) {
  return apiClient<{ message?: string }>(`/organizations/${organizationId}/tax-codes/${taxCodeId}`, {
    method: "DELETE",
  });
}

export async function getDocumentSettings(organizationId: string) {
  return optionalRequest(
    async () => {
      const response = await apiClient<RawSettings>(`/organizations/${organizationId}/document-settings`);
      return adaptDocumentSettings(response);
    },
    null,
  );
}

export async function updateDocumentSettings(organizationId: string, payload: DocumentSettingsPayload) {
  const response = await apiClient<RawSettings>(`/organizations/${organizationId}/document-settings`, {
    method: "PATCH",
    body: payload,
  });
  return adaptDocumentSettings(response);
}

export async function getAccountingSettings(organizationId: string) {
  try {
    const [organization, settings] = await Promise.all([
      apiClient<RawOrganization>(`/organizations/${organizationId}`),
      apiClient<RawSettings>(`/organizations/${organizationId}/accounting-settings`),
    ]);
    return adaptAccountingSettings(organization, settings);
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  const [organization, settings] = await Promise.all([
    apiClient<RawOrganization>(`/organizations/${organizationId}`),
    optionalRequest(() => apiClient<RawSettings>(`/organizations/${organizationId}/settings`), {}),
  ]);

  return adaptAccountingSettings(organization, settings);
}

export async function updateAccountingSettings(organizationId: string, payload: AccountingSettingsPayload) {
  try {
    const [organization, settings] = await Promise.all([
      apiClient<RawOrganization>(`/organizations/${organizationId}`),
      apiClient<RawSettings>(`/organizations/${organizationId}/accounting-settings`, {
        method: "PATCH",
        body: payload,
      }),
    ]);

    return adaptAccountingSettings(organization, settings);
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  const [organization, settings] = await Promise.all([
    apiClient<RawOrganization>(`/organizations/${organizationId}`),
    apiClient<RawSettings>(`/organizations/${organizationId}/settings`, {
      method: "PATCH",
      body: payload,
    }),
  ]);

  return adaptAccountingSettings(organization, settings);
}
