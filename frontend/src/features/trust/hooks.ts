import { useQuery } from "@tanstack/react-query";

import { fetchIntegrityCenter, fetchMetricProvenance, fetchTrustSummary } from "@/features/trust/api";

export function useTrustSummary(organizationId?: string) {
  return useQuery({
    queryKey: ["trust", organizationId, "summary"],
    queryFn: () => fetchTrustSummary(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useMetricProvenance(organizationId?: string, metricId?: string) {
  return useQuery({
    queryKey: ["trust", organizationId, "metric", metricId],
    queryFn: () => fetchMetricProvenance(organizationId!, metricId!),
    enabled: Boolean(organizationId && metricId),
  });
}

export function useIntegrityCenter(organizationId?: string) {
  return useQuery({
    queryKey: ["trust", organizationId, "integrity-center"],
    queryFn: () => fetchIntegrityCenter(organizationId!),
    enabled: Boolean(organizationId),
  });
}
