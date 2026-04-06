import { apiClient } from "@/lib/api/client";

import type { DashboardPage } from "@/features/dashboard/types";

export async function getDashboardOverview(organizationId: string) {
  return apiClient<DashboardPage>(`/organizations/${organizationId}/dashboard/overview`);
}
