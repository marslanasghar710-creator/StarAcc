"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { getOrganization, getOrganizationSettings, listOrganizationMembers, listOrganizations } from "@/features/organizations/api";

export function useOrganizationsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.organizations.list,
    queryFn: listOrganizations,
    enabled,
  });
}

export function useOrganizationQuery(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.organizations.detail(organizationId) : ["organizations", "detail", "missing"],
    queryFn: () => getOrganization(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useOrganizationSettingsQuery(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.organizations.settings(organizationId) : ["organizations", "settings", "missing"],
    queryFn: () => getOrganizationSettings(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useOrganizationMembersQuery(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.organizations.members(organizationId) : ["organizations", "members", "missing"],
    queryFn: () => listOrganizationMembers(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}
