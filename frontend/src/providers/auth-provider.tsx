"use client";

import * as React from "react";

type AuthState = {
  isAuthenticated: boolean;
  userName?: string;
};

const AuthContext = React.createContext<AuthState>({
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // TODO(F01): hydrate session and token refresh state from the backend auth foundation.
  const value = React.useMemo<AuthState>(() => ({ isAuthenticated: false }), []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
