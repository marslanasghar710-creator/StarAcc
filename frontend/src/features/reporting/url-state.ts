export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function startOfMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export function withUpdatedQuery(
  current: URLSearchParams,
  values: Record<string, string | boolean | null | undefined>,
) {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "" || value === false) {
      next.delete(key);
    } else {
      next.set(key, typeof value === "boolean" ? String(value) : value);
    }
  }

  return next.toString();
}
