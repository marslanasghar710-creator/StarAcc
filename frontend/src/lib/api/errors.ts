export type ApiErrorShape = {
  status: number;
  message: string;
  details?: unknown;
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor({ status, message, details }: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function normalizeApiError(response: Response): Promise<ApiError> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  const detail = typeof payload === "object" && payload !== null && "detail" in payload ? (payload as { detail?: unknown }).detail : undefined;
  const message = typeof detail === "string" ? detail : response.statusText || "Request failed";

  return new ApiError({
    status: response.status,
    message,
    details: payload,
  });
}
