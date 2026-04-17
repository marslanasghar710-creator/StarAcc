"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useOrganizationsQuery } from "@/features/organizations/hooks";
import type { OrganizationSummary } from "@/features/organizations/types";
import { useAuth } from "@/providers/auth-provider";

const ACTIVE_ORGANIZATION_STORAGE_KEY = "staracc.active-organization-id";
const ORGANIZATION_MEMBERSHIP_INVALID_EVENT = "staracc:organization-membership-invalid";

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
  const [invalidOrganizationIds, setInvalidOrganizationIds] = React.useState<Set<string>>(new Set());
  const previousOrganizationIdRef = React.useRef<string | null>(null);

  const membershipSet = React.useMemo(() => new Set(memberships.map((membership) => membership.organization_id)), [memberships]);
  const scopedOrganizations = React.useMemo(
    () => organizations.filter((organization) => membershipSet.has(organization.id) && !invalidOrganizationIds.has(organization.id)),
    [invalidOrganizationIds, membershipSet, organizations],
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleMembershipInvalid = (event: Event) => {
      const customEvent = event as CustomEvent<{ organizationId?: string }>;
      const invalidOrganizationId = customEvent.detail?.organizationId;
      if (!invalidOrganizationId) {
        return;
      }

      setInvalidOrganizationIds((current) => {
        if (current.has(invalidOrganizationId)) {
          return current;
        }
        const next = new Set(current);
        next.add(invalidOrganizationId);
        return next;
      });

      if (currentOrganizationId === invalidOrganizationId) {
        setCurrentOrganizationIdState(null);
        window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
      }
    };

    window.addEventListener(ORGANIZATION_MEMBERSHIP_INVALID_EVENT, handleMembershipInvalid as EventListener);
    return () => window.removeEventListener(ORGANIZATION_MEMBERSHIP_INVALID_EVENT, handleMembershipInvalid as EventListener);
  }, [currentOrganizationId]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isAuthenticated) {
      setCurrentOrganizationIdState(null);
      setInvalidOrganizationIds(new Set());
      window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
      return;
    }

    if (!scopedOrganizations.length) {
      setCurrentOrganizationIdState(null);
      window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
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

  React.useEffect(() => {
    const previousOrganizationId = previousOrganizationIdRef.current;
    if (!previousOrganizationId || previousOrganizationId === currentOrganizationId) {
      previousOrganizationIdRef.current = currentOrganizationId;
      return;
    }

    void queryClient.cancelQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey.includes(previousOrganizationId),
    });
    queryClient.removeQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey.includes(previousOrganizationId),
    });

    previousOrganizationIdRef.current = currentOrganizationId;
  }, [currentOrganizationId, queryClient]);

  const setCurrentOrganizationId = React.useCallback(
    (organizationId: string) => {
      if (!membershipSet.has(organizationId)) {
        return;
      }
      setCurrentOrganizationIdState(organizationId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
      }
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["organizations", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["accounts", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["journals", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["periods", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["reports", organizationId] });
    },
    [membershipSet, queryClient],
  );

  const currentOrganization = React.useMemo(
    () => scopedOrganizations.find((organization) => organization.id === currentOrganizationId) ?? null,
    [currentOrganizationId, scopedOrganizations],
  );
  const scopedCurrentOrganizationId = currentOrganization?.id ?? null;

  const value = React.useMemo<OrganizationContextValue>(
    () => ({
      organizations: scopedOrganizations,
      currentOrganizationId: scopedCurrentOrganizationId,
      currentOrganization,
      setCurrentOrganizationId,
      isLoadingOrganizations: isLoading || isBootstrapping,
    }),
    [currentOrganization, isBootstrapping, isLoading, scopedCurrentOrganizationId, scopedOrganizations, setCurrentOrganizationId],
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
