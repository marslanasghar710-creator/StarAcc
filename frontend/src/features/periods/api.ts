import { apiClient } from "@/lib/api/client";

import type { Period, RawPeriod } from "@/features/periods/types";

function adaptPeriod(raw: RawPeriod): Period {
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    name: raw.name,
    startDate: raw.start_date ?? raw.startDate ?? "",
    endDate: raw.end_date ?? raw.endDate ?? "",
    fiscalYear: raw.fiscal_year ?? raw.fiscalYear,
    periodNumber: raw.period_number ?? raw.periodNumber,
    status: raw.status,
  };
}

export async function listPeriods(organizationId: string) {
  const response = await apiClient<{ items: RawPeriod[] }>(`/organizations/${organizationId}/periods`);
  return response.items.map(adaptPeriod);
}

export async function getPeriod(organizationId: string, periodId: string) {
  const response = await apiClient<RawPeriod>(`/organizations/${organizationId}/periods/${periodId}`);
  return adaptPeriod(response);
}
