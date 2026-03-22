import * as React from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Period } from "@/features/periods/types";

export function ReportPeriodSelector({
  periods,
  value,
  onValueChange,
  placeholder = "All periods",
}: {
  periods: Period[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value || "all"} onValueChange={(nextValue) => onValueChange(nextValue === "all" ? "" : nextValue)}>
      <SelectTrigger className="min-w-[180px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {periods.map((period) => (
          <SelectItem key={period.id} value={period.id}>
            {period.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
