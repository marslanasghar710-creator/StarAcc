"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { getCurrentUser, listPermissions, listRoles, listSessions, login, logout, register, revokeSession } from "@/features/auth/api";
import type { LoginPayload, RegisterPayload } from "@/features/auth/api";

export function useCurrentUserQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getCurrentUser,
    enabled,
  });
}

export function useRolesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.roles,
    queryFn: listRoles,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function usePermissionsCatalogQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.permissions,
    queryFn: listPermissions,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useSessionsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.sessions,
    queryFn: listSessions,
    enabled,
  });
}

export function useLoginMutation() {
  return useMutation({ mutationFn: (payload: LoginPayload) => login(payload) });
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: (payload: RegisterPayload) => register(payload) });
}

export function useLogoutMutation() {
  return useMutation({ mutationFn: (payload: { refreshToken: string }) => logout(payload) });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
    },
  });
}
