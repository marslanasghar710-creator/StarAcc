import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ComparisonMode } from "@/features/reporting/types";

const LABELS: Record<ComparisonMode, string> = {
  none: "Current period",
  previous_period: "Previous period",
  prior_year: "Prior year",
};

export function StatementComparisonToggle({
  value,
  onChange,
  options,
}: {
  value: ComparisonMode;
  onChange: (value: ComparisonMode) => void;
  options: ComparisonMode[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <Button key={option} type="button" variant={option === value ? "default" : "outline"} onClick={() => onChange(option)}>
          {LABELS[option]}
        </Button>
      ))}
      {value !== "none" ? <Badge variant="secondary">Comparison enabled</Badge> : null}
    </div>
  );
}
