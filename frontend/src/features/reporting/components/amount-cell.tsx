import * as React from "react";

import { MoneyDisplay } from "@/components/shared/money-display";
import { cn } from "@/lib/utils";

export function AmountCell({
  value,
  currencyCode,
  className,
  muted = false,
}: {
  value: string | number | null | undefined;
  currencyCode?: string | null;
  className?: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("text-right tabular-nums", muted ? "text-muted-foreground" : undefined, className)}>
      <MoneyDisplay value={value} currencyCode={currencyCode} className="justify-end" />
    </div>
  );
}
