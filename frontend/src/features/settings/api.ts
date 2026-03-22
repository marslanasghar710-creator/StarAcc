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
  TaxCodeCollection,
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

async function requestWithFallback<T>(requests: Array<() => Promise<T>>): Promise<{ data: T; index: number }> {
  let lastError: unknown;

  for (let index = 0; index < requests.length; index += 1) {
    try {
      const data = await requests[index]!();
      return { data, index };
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError ?? new ApiError({ status: 404, message: "Requested settings resource was not found." });
}

function mapPeriodCreatePayload(payload: FiscalPeriodPayload) {
  const startDate = new Date(payload.start_date);
  return {
    name: payload.name,
    start_date: payload.start_date,
    end_date: payload.end_date,
    fiscal_year: payload.fiscal_year ?? (Number.isNaN(startDate.getUTCFullYear()) ? undefined : startDate.getUTCFullYear()),
    period_number: payload.period_number ?? (Number.isNaN(startDate.getUTCMonth()) ? undefined : startDate.getUTCMonth() + 1),
  };
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
  const { data } = await requestWithFallback([
    () => listPeriodsFrom(`/organizations/${organizationId}/fiscal-periods`),
    () => listPeriodsFrom(`/organizations/${organizationId}/periods`),
  ]);

  return data;
}

export async function getFiscalPeriod(organizationId: string, periodId: string) {
  const { data } = await requestWithFallback([
    async () => adaptFiscalPeriod(await apiClient<RawFiscalPeriod>(`/organizations/${organizationId}/fiscal-periods/${periodId}`)),
    async () => adaptFiscalPeriod(await apiClient<RawFiscalPeriod>(`/organizations/${organizationId}/periods/${periodId}`)),
  ]);

  return data;
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
    body: mapPeriodCreatePayload(payload),
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
  const { data } = await requestWithFallback([
    () => apiClient<RawFiscalPeriod>(`/organizations/${organizationId}/fiscal-periods/${periodId}/${action}`, { method: "POST" }),
    () => apiClient<RawFiscalPeriod>(`/organizations/${organizationId}/periods/${periodId}/${action}`, { method: "POST" }),
  ]);

  return adaptFiscalPeriod(data);
}

export function closeFiscalPeriod(organizationId: string, periodId: string) {
  return postPeriodAction(organizationId, periodId, "close");
}

export function reopenFiscalPeriod(organizationId: string, periodId: string) {
  return postPeriodAction(organizationId, periodId, "reopen");
}

export async function listTaxCodes(organizationId: string): Promise<TaxCodeCollection | null> {
  try {
    const response = await apiClient<{ items?: RawTaxCode[] } | RawTaxCode[]>(`/organizations/${organizationId}/tax-codes`);
    const items = Array.isArray(response) ? response : response.items ?? [];

    return {
      items: items.map((item) => adaptTaxCode(item, { dataSource: "native" })),
      dataSource: "native",
      supportsWrite: true,
    };
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  try {
    const response = await apiClient<{ items?: RawTaxCode[] } | RawTaxCode[]>(`/organizations/${organizationId}/tax/codes`);
    const items = Array.isArray(response) ? response : response.items ?? [];
    const readOnlyReason = "This backend exposes legacy compound tax-code endpoints, so this screen stays read-only to avoid inventing rate/component truth in the frontend.";

    return {
      items: items.map((item) => adaptTaxCode(item, { dataSource: "legacy", readOnlyReason })),
      dataSource: "legacy",
      supportsWrite: false,
      readOnlyReason,
    };
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  return null;
}

export async function getTaxCode(organizationId: string, taxCodeId: string) {
  return optionalRequest(
    async () => {
      const { data, index } = await requestWithFallback([
        () => apiClient<RawTaxCode>(`/organizations/${organizationId}/tax-codes/${taxCodeId}`),
        () => apiClient<RawTaxCode>(`/organizations/${organizationId}/tax/codes/${taxCodeId}`),
      ]);

      return adaptTaxCode(data, {
        dataSource: index === 0 ? "native" : "legacy",
        readOnlyReason: index === 0 ? null : "Legacy tax-code payloads are read-only in this frontend.",
      });
    },
    null,
  );
}

function unsupportedLegacyTaxWrite(): never {
  throw new ApiError({
    status: 405,
    message: "Tax code write actions require the simplified /tax-codes backend contract. The legacy /tax/codes API is exposed as read-only in this UI.",
  });
}

export async function createTaxCode(organizationId: string, payload: TaxCodePayload) {
  try {
    const response = await apiClient<RawTaxCode>(`/organizations/${organizationId}/tax-codes`, {
      method: "POST",
      body: payload,
    });
    return adaptTaxCode(response, { dataSource: "native" });
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  return unsupportedLegacyTaxWrite();
}

export async function updateTaxCode(organizationId: string, taxCodeId: string, payload: TaxCodePayload) {
  try {
    const response = await apiClient<RawTaxCode>(`/organizations/${organizationId}/tax-codes/${taxCodeId}`, {
      method: "PATCH",
      body: payload,
    });
    return adaptTaxCode(response, { dataSource: "native" });
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  return unsupportedLegacyTaxWrite();
}

export async function archiveTaxCode(organizationId: string, taxCodeId: string) {
  try {
    return await apiClient<{ message?: string }>(`/organizations/${organizationId}/tax-codes/${taxCodeId}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  return unsupportedLegacyTaxWrite();
}

export async function getDocumentSettings(organizationId: string) {
  try {
    const response = await apiClient<RawSettings>(`/organizations/${organizationId}/document-settings`);
    return adaptDocumentSettings(response, "native");
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  const { data, index } = await requestWithFallback([
    () => apiClient<RawSettings>(`/organizations/${organizationId}/settings/numbering`),
    () => apiClient<RawSettings>(`/organizations/${organizationId}/settings`),
  ]);

  return adaptDocumentSettings(data, index === 0 ? "legacy" : "native");
}

export async function updateDocumentSettings(organizationId: string, payload: DocumentSettingsPayload) {
  try {
    const response = await apiClient<RawSettings>(`/organizations/${organizationId}/document-settings`, {
      method: "PATCH",
      body: payload,
    });
    return adaptDocumentSettings(response, "native");
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  try {
    const response = await apiClient<RawSettings>(`/organizations/${organizationId}/settings/numbering`, {
      method: "PATCH",
      body: payload,
    });
    return adaptDocumentSettings(response, "legacy");
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  const response = await apiClient<RawSettings>(`/organizations/${organizationId}/settings`, {
    method: "PATCH",
    body: payload,
  });
  return adaptDocumentSettings(response, "native");
}

export async function getAccountingSettings(organizationId: string) {
  const organization = await apiClient<RawOrganization>(`/organizations/${organizationId}`);

  try {
    const response = await apiClient<RawSettings>(`/organizations/${organizationId}/accounting-settings`);
    return adaptAccountingSettings(organization, response, "native");
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  const { data, index } = await requestWithFallback([
    () => apiClient<RawSettings>(`/organizations/${organizationId}/settings/preferences`),
    () => apiClient<RawSettings>(`/organizations/${organizationId}/settings`),
  ]);

  return adaptAccountingSettings(organization, data, index === 0 ? "legacy" : "native");
}

export async function updateAccountingSettings(organizationId: string, payload: AccountingSettingsPayload) {
  const organization = await apiClient<RawOrganization>(`/organizations/${organizationId}`);

  try {
    const response = await apiClient<RawSettings>(`/organizations/${organizationId}/accounting-settings`, {
      method: "PATCH",
      body: payload,
    });
    return adaptAccountingSettings(organization, response, "native");
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  try {
    const response = await apiClient<RawSettings>(`/organizations/${organizationId}/settings/preferences`, {
      method: "PATCH",
      body: payload,
    });
    return adaptAccountingSettings(organization, response, "legacy");
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
      throw error;
    }
  }

  const response = await apiClient<RawSettings>(`/organizations/${organizationId}/settings`, {
    method: "PATCH",
    body: payload,
  });

  return adaptAccountingSettings(organization, response, "native");
}
