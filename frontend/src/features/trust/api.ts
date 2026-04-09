import { apiClient } from "@/lib/api/client";
import type { IntegrityCenter, MetricProvenance, TrustSummary } from "@/features/trust/types";

export function fetchTrustSummary(organizationId: string) {
  return apiClient<TrustSummary>(`/api/trust/summary?organization_id=${organizationId}`);
}

export function fetchMetricProvenance(organizationId: string, metricId: string) {
  return apiClient<MetricProvenance>(`/api/trust/metric-provenance?organization_id=${organizationId}&metric_id=${metricId}`);
}

export function fetchIntegrityCenter(organizationId: string) {
  return apiClient<IntegrityCenter>(`/api/trust/integrity-center?organization_id=${organizationId}`);
}
