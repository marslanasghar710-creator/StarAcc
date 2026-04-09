import { useQuery } from "@tanstack/react-query";

import {
  fetchAdminErrors,
  fetchAdminJobs,
  fetchAdminOverview,
  fetchAdminPerformance,
  fetchAttentionQueue,
  fetchOrgHealth,
  fetchOrgHealthDetail,
  fetchPlatformHealth,
} from "@/features/observability/api";

export function useAdminOverview(organizationId?: string) {
  return useQuery({ queryKey: ["admin", organizationId, "overview"], queryFn: () => fetchAdminOverview(organizationId!), enabled: Boolean(organizationId) });
}

export function usePlatformHealth(organizationId?: string) {
  return useQuery({ queryKey: ["admin", organizationId, "platform-health"], queryFn: () => fetchPlatformHealth(organizationId!), enabled: Boolean(organizationId) });
}

export function useOrgHealthList(organizationId?: string) {
  return useQuery({ queryKey: ["admin", organizationId, "org-health"], queryFn: () => fetchOrgHealth(organizationId!), enabled: Boolean(organizationId) });
}

export function useOrgHealthDetail(organizationId?: string, targetOrgId?: string) {
  return useQuery({ queryKey: ["admin", organizationId, "org-health", targetOrgId], queryFn: () => fetchOrgHealthDetail(organizationId!, targetOrgId!), enabled: Boolean(organizationId && targetOrgId) });
}

export function useAdminErrors(organizationId?: string) {
  return useQuery({ queryKey: ["admin", organizationId, "errors"], queryFn: () => fetchAdminErrors(organizationId!), enabled: Boolean(organizationId) });
}

export function useAdminJobs(organizationId?: string) {
  return useQuery({ queryKey: ["admin", organizationId, "jobs"], queryFn: () => fetchAdminJobs(organizationId!), enabled: Boolean(organizationId) });
}

export function useAdminPerformance(organizationId?: string) {
  return useQuery({ queryKey: ["admin", organizationId, "performance"], queryFn: () => fetchAdminPerformance(organizationId!), enabled: Boolean(organizationId) });
}

export function useAttentionQueue(organizationId?: string) {
  return useQuery({ queryKey: ["admin", organizationId, "attention-queue"], queryFn: () => fetchAttentionQueue(organizationId!), enabled: Boolean(organizationId) });
}
