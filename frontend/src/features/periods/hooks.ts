"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { getPeriod, listPeriods } from "@/features/periods/api";

export function usePeriods(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.periods.list(organizationId) : ["periods", "missing", "list"],
    queryFn: () => listPeriods(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function usePeriod(organizationId?: string, periodId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && periodId ? queryKeys.periods.detail(organizationId, periodId) : ["periods", "missing", "detail"],
    queryFn: () => getPeriod(organizationId as string, periodId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(periodId),
  });
}
