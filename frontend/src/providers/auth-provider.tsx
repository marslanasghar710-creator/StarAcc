"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getCurrentUser, listPermissions, listRoles, login as loginRequest, logout as logoutRequest, refreshSession, register as registerRequest } from "@/features/auth/api";
import type { AuthUser, PermissionRecord, RoleRecord, UserOrganizationMembership } from "@/features/auth/types";
import { clearSession, getRefreshTokenValue, persistSession } from "@/lib/auth/session";
import { getRememberSessionPreference, hasStoredSession } from "@/lib/auth/token-storage";
import { queryKeys } from "@/features/api/query-keys";

type AuthContextValue = {
  user: AuthUser | null;
  memberships: UserOrganizationMembership[];
  roles: RoleRecord[];
  permissionsCatalog: PermissionRecord[];
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: { email: string; password: string; rememberMe: boolean }) => Promise<void>;
  register: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function loadAuthContextData() {
  const [me, roles, permissionsCatalog] = await Promise.all([getCurrentUser(), listRoles(), listPermissions()]);

  return {
    user: me.user,
    memberships: me.organizations,
    roles,
    permissionsCatalog,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [memberships, setMemberships] = React.useState<UserOrganizationMembership[]>([]);
  const [roles, setRoles] = React.useState<RoleRecord[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = React.useState<PermissionRecord[]>([]);
  const [isBootstrapping, setIsBootstrapping] = React.useState(true);

  const setResolvedState = React.useCallback((resolved: Awaited<ReturnType<typeof loadAuthContextData>>) => {
    setUser(resolved.user);
    setMemberships(resolved.memberships);
    setRoles(resolved.roles);
    setPermissionsCatalog(resolved.permissionsCatalog);
    queryClient.setQueryData(queryKeys.auth.me, { user: resolved.user, organizations: resolved.memberships });
    queryClient.setQueryData(queryKeys.auth.roles, resolved.roles);
    queryClient.setQueryData(queryKeys.auth.permissions, resolved.permissionsCatalog);
  }, [queryClient]);

  const clearResolvedState = React.useCallback(() => {
    setUser(null);
    setMemberships([]);
    setRoles([]);
    setPermissionsCatalog([]);
    queryClient.removeQueries({ queryKey: ["notifications"] });
    queryClient.removeQueries({ queryKey: ["organizations"] });
    queryClient.removeQueries({ queryKey: ["auth"] });
  }, [queryClient]);

  const refresh = React.useCallback(async () => {
    const refreshToken = getRefreshTokenValue();

    if (!refreshToken) {
      clearSession();
      clearResolvedState();
      throw new Error("No refresh token available");
    }

    const tokenResponse = await refreshSession(refreshToken);
    persistSession({ accessToken: tokenResponse.access_token, refreshToken: tokenResponse.refresh_token }, getRememberSessionPreference());
    const resolved = await loadAuthContextData();
    setResolvedState(resolved);
  }, [clearResolvedState, setResolvedState]);

  const bootstrap = React.useCallback(async () => {
    if (!hasStoredSession()) {
      clearResolvedState();
      setIsBootstrapping(false);
      return;
    }

    try {
      const resolved = await loadAuthContextData();
      setResolvedState(resolved);
    } catch {
      try {
        await refresh();
      } catch {
        clearSession();
        clearResolvedState();
      }
    } finally {
      setIsBootstrapping(false);
    }
  }, [clearResolvedState, refresh, setResolvedState]);

  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = React.useCallback(async ({ email, password, rememberMe }: { email: string; password: string; rememberMe: boolean }) => {
    const tokenResponse = await loginRequest({ email, password });
    persistSession({ accessToken: tokenResponse.access_token, refreshToken: tokenResponse.refresh_token }, rememberMe);
    const resolved = await loadAuthContextData();
    setResolvedState(resolved);
  }, [setResolvedState]);

  const register = React.useCallback(async ({ email, password }: { email: string; password: string }) => {
    await registerRequest({ email, password });
  }, []);

  const logout = React.useCallback(async () => {
    const refreshToken = getRefreshTokenValue();

    try {
      if (refreshToken) {
        await logoutRequest({ refreshToken });
      }
    } finally {
      clearSession();
      clearResolvedState();
    }
  }, [clearResolvedState]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      memberships,
      roles,
      permissionsCatalog,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      register,
      logout,
      refresh,
    }),
    [isBootstrapping, login, logout, memberships, permissionsCatalog, refresh, register, roles, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
