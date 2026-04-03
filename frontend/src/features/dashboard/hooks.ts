"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { getDashboardOverview } from "@/features/dashboard/api";

export function useDashboardOverview(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.dashboard.overview(organizationId) : ["dashboard", "missing", "overview"],
    queryFn: () => getDashboardOverview(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}
