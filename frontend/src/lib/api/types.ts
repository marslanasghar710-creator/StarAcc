export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: BodyInit | object | null;
  headers?: HeadersInit;
  token?: string | null;
  cache?: RequestCache;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
  skipAuth?: boolean;
  retryOnUnauthorized?: boolean;
  signal?: AbortSignal;
};

export type PaginatedResponse<T> = {
  items: T[];
};
