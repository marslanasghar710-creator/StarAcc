import { clientEnv } from "@/lib/env/client";
import { ApiError, normalizeApiError } from "@/lib/api/errors";
import { clearSession, getAccessTokenValue, getRefreshTokenValue, persistSession } from "@/lib/auth/session";
import { getRememberSessionPreference } from "@/lib/auth/token-storage";
import type { ApiRequestOptions } from "@/lib/api/types";

type RefreshResponse = {
  access_token: string;
  refresh_token: string;
};

let refreshPromise: Promise<string | null> | null = null;

function isBodyInit(value: unknown): value is BodyInit {
  return value instanceof FormData || value instanceof URLSearchParams || value instanceof Blob || typeof value === "string" || value instanceof ArrayBuffer;
}

async function buildHeaders(options: ApiRequestOptions) {
  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const token = options.skipAuth ? null : options.token ?? getAccessTokenValue();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && options.body && !isBodyInit(options.body)) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

function buildBody(body: ApiRequestOptions["body"]) {
  if (!body) {
    return undefined;
  }

  if (isBodyInit(body)) {
    return body;
  }

  return JSON.stringify(body);
}

async function refreshAccessToken() {
  const refreshToken = getRefreshTokenValue();

  if (!refreshToken) {
    clearSession();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${clientEnv.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw await normalizeApiError(response);
        }

        const payload = (await response.json()) as RefreshResponse;
        persistSession(
          {
            accessToken: payload.access_token,
            refreshToken: payload.refresh_token,
          },
          getRememberSessionPreference(),
        );
        return payload.access_token;
      })
      .catch((error) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiClient<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const retryOnUnauthorized = options.retryOnUnauthorized ?? !options.skipAuth;
  const headers = await buildHeaders(options);
  const requestInit: RequestInit & { next?: ApiRequestOptions["next"] } = {
    method: options.method ?? "GET",
    headers,
    body: buildBody(options.body),
    cache: options.cache,
    signal: options.signal,
    credentials: "include",
  };

  if (options.next) {
    requestInit.next = options.next;
  }

  const response = await fetch(`${clientEnv.NEXT_PUBLIC_API_BASE_URL}${path}`, requestInit);

  if (response.status === 401 && retryOnUnauthorized && !options.skipAuth) {
    try {
      const accessToken = await refreshAccessToken();

      if (accessToken) {
        return apiClient<T>(path, {
          ...options,
          token: accessToken,
          retryOnUnauthorized: false,
        });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
    }
  }

  if (!response.ok) {
    throw await normalizeApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
