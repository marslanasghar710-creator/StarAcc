import { apiClient } from "@/lib/api/client";
import type { MeResponse, PermissionRecord, RoleRecord, SessionsResponse, TokenResponse } from "@/features/auth/types";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload) {
  return apiClient<TokenResponse>("/auth/login", {
    method: "POST",
    body: payload,
    skipAuth: true,
    retryOnUnauthorized: false,
  });
}

export async function register(payload: RegisterPayload) {
  return apiClient("/auth/register", {
    method: "POST",
    body: payload,
    skipAuth: true,
    retryOnUnauthorized: false,
  });
}

export async function refreshSession(refreshToken: string) {
  return apiClient<TokenResponse>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
    skipAuth: true,
    retryOnUnauthorized: false,
  });
}

export async function logout(payload: { refreshToken: string }) {
  return apiClient<{ message: string }>("/auth/logout", {
    method: "POST",
    body: { refresh_token: payload.refreshToken },
  });
}

export async function getCurrentUser() {
  return apiClient<MeResponse>("/auth/me");
}

export async function listSessions() {
  return apiClient<SessionsResponse>("/auth/sessions");
}

export async function revokeSession(sessionId: string) {
  return apiClient<{ message: string }>(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function listRoles() {
  return apiClient<RoleRecord[]>("/roles");
}

export async function listPermissions() {
  return apiClient<PermissionRecord[]>("/permissions");
}
