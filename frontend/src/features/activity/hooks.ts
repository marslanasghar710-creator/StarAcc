"use client";

import { useQuery } from "@tanstack/react-query";

import { getActivityCenter } from "@/features/activity/api";
import type { ActivityCenterFilters } from "@/features/activity/types";
import { queryKeys } from "@/features/api/query-keys";

export function useActivityCenter(organizationId?: string, filters: ActivityCenterFilters = {}, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.audit.activityCenter(organizationId, filters) : ["audit", "missing"],
    queryFn: () => getActivityCenter(organizationId as string, filters),
    enabled: enabled && Boolean(organizationId),
  });
}
