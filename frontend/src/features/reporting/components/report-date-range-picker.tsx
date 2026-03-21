import * as React from "react";

import { Input } from "@/components/ui/input";

export function ReportDateRangePicker({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  asOf = false,
}: {
  fromDate: string;
  toDate?: string;
  onFromDateChange: (value: string) => void;
  onToDateChange?: (value: string) => void;
  asOf?: boolean;
}) {
  if (asOf) {
    return <Input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} className="min-w-[170px]" aria-label="As of date" />;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} className="min-w-[160px]" aria-label="From date" />
      <span className="text-sm text-muted-foreground">to</span>
      <Input type="date" value={toDate ?? ""} onChange={(event) => onToDateChange?.(event.target.value)} className="min-w-[160px]" aria-label="To date" />
    </div>
  );
}
