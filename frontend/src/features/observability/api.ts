import { apiClient } from "@/lib/api/client";
import type { AdminOverview, ErrorRecord, JobExecutionRecord, OrgHealthSnapshot, PerformanceMetric, PlatformHealthSummary, AttentionQueueItem } from "@/features/observability/types";

export function fetchPlatformHealth(organizationId: string) {
  return apiClient<PlatformHealthSummary>(`/organizations/${organizationId}/admin/platform-health`);
}

export function fetchOrgHealth(organizationId: string) {
  return apiClient<OrgHealthSnapshot[]>(`/organizations/${organizationId}/admin/org-health`);
}

export function fetchOrgHealthDetail(organizationId: string, targetOrgId: string) {
  return apiClient<OrgHealthSnapshot>(`/organizations/${organizationId}/admin/orgs/${targetOrgId}/health`);
}

export function fetchAdminErrors(organizationId: string) {
  return apiClient<ErrorRecord[]>(`/organizations/${organizationId}/admin/errors`);
}

export function fetchAdminJobs(organizationId: string) {
  return apiClient<JobExecutionRecord[]>(`/organizations/${organizationId}/admin/jobs`);
}

export function fetchAdminPerformance(organizationId: string) {
  return apiClient<PerformanceMetric[]>(`/organizations/${organizationId}/admin/performance`);
}

export function fetchAttentionQueue(organizationId: string) {
  return apiClient<AttentionQueueItem[]>(`/organizations/${organizationId}/admin/attention-queue`);
}

export function fetchAdminOverview(organizationId: string) {
  return apiClient<AdminOverview>(`/organizations/${organizationId}/admin/overview`);
}
