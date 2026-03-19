"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useOrganizationsQuery } from "@/features/organizations/hooks";
import type { OrganizationSummary } from "@/features/organizations/types";
import { useAuth } from "@/providers/auth-provider";

const ACTIVE_ORGANIZATION_STORAGE_KEY = "staracc.active-organization-id";

type OrganizationContextValue = {
  organizations: OrganizationSummary[];
  currentOrganizationId: string | null;
  currentOrganization: OrganizationSummary | null;
  setCurrentOrganizationId: (organizationId: string) => void;
  isLoadingOrganizations: boolean;
};

const OrganizationContext = React.createContext<OrganizationContextValue | null>(null);

function getStoredOrganizationId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, memberships, isBootstrapping } = useAuth();
  const { data: organizations = [], isLoading } = useOrganizationsQuery(isAuthenticated);
  const [currentOrganizationId, setCurrentOrganizationIdState] = React.useState<string | null>(null);

  const membershipSet = React.useMemo(() => new Set(memberships.map((membership) => membership.organization_id)), [memberships]);
  const scopedOrganizations = React.useMemo(() => organizations.filter((organization) => membershipSet.has(organization.id)), [membershipSet, organizations]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isAuthenticated) {
      setCurrentOrganizationIdState(null);
      window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
      return;
    }

    if (!scopedOrganizations.length) {
      return;
    }

    const stored = getStoredOrganizationId();
    const stillValid = stored ? scopedOrganizations.some((organization) => organization.id === stored) : false;
    const nextOrganizationId = stillValid ? stored : scopedOrganizations[0]?.id ?? null;

    if (nextOrganizationId && nextOrganizationId !== currentOrganizationId) {
      setCurrentOrganizationIdState(nextOrganizationId);
      window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, nextOrganizationId);
    }
  }, [currentOrganizationId, isAuthenticated, scopedOrganizations]);

  const setCurrentOrganizationId = React.useCallback(
    (organizationId: string) => {
      setCurrentOrganizationIdState(organizationId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
      }
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["organizations", organizationId] });
    },
    [queryClient],
  );

  const currentOrganization = React.useMemo(
    () => scopedOrganizations.find((organization) => organization.id === currentOrganizationId) ?? null,
    [currentOrganizationId, scopedOrganizations],
  );

  const value = React.useMemo<OrganizationContextValue>(
    () => ({
      organizations: scopedOrganizations,
      currentOrganizationId,
      currentOrganization,
      setCurrentOrganizationId,
      isLoadingOrganizations: isLoading || isBootstrapping,
    }),
    [currentOrganization, currentOrganizationId, isBootstrapping, isLoading, scopedOrganizations, setCurrentOrganizationId],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = React.useContext(OrganizationContext);

  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }

  return context;
}
