"use client";

import * as React from "react";

type OrganizationState = {
  currentOrganizationName: string;
};

const OrganizationContext = React.createContext<OrganizationState>({
  currentOrganizationName: "Acme Holdings Ltd.",
});

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  // TODO(F01/F02): replace placeholder org state with backend-driven organization selection.
  const value = React.useMemo<OrganizationState>(() => ({ currentOrganizationName: "Acme Holdings Ltd." }), []);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  return React.useContext(OrganizationContext);
}
