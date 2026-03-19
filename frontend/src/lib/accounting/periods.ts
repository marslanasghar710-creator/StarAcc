import type { Period, PeriodStatus } from "@/features/periods/types";

export function resolvePeriodForDate(periods: Period[], entryDate?: string | null): Period | null {
  if (!entryDate) {
    return null;
  }

  return (
    periods.find((period) => period.startDate <= entryDate && period.endDate >= entryDate) ?? null
  );
}

export function getPeriodStatusTone(status: PeriodStatus) {
  switch (status) {
    case "open":
      return "success" as const;
    case "closed":
      return "warning" as const;
    case "locked":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
}
