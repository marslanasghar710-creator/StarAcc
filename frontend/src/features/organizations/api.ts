import { apiClient } from "@/lib/api/client";
import type { OrganizationMember, OrganizationSettings, OrganizationSummary } from "@/features/organizations/types";

export async function listOrganizations() {
  return apiClient<OrganizationSummary[]>("/organizations");
}

export async function getOrganization(organizationId: string) {
  return apiClient<OrganizationSummary>(`/organizations/${organizationId}`);
}

export async function getOrganizationSettings(organizationId: string) {
  return apiClient<OrganizationSettings>(`/organizations/${organizationId}/settings`);
}

export async function listOrganizationMembers(organizationId: string) {
  return apiClient<OrganizationMember[]>(`/organizations/${organizationId}/members`);
}
