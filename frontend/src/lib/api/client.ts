import { clientEnv } from "@/lib/env/client";
import { normalizeApiError } from "@/lib/api/errors";
import type { ApiRequestOptions } from "@/lib/api/types";
import { getAccessToken } from "@/lib/auth/session";

async function buildHeaders(options: ApiRequestOptions) {
  const headers = new Headers(options.headers);
  const token = options.token ?? (await getAccessToken());

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export async function apiClient<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = await buildHeaders(options);
  const response = await fetch(`${clientEnv.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
    cache: options.cache,
    next: options.next,
    credentials: "include",
  });

  if (!response.ok) {
    throw await normalizeApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
