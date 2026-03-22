import * as React from "react";

import { cn } from "@/lib/utils";

export function ReportTotalRow({
  children,
  emphasized = false,
}: {
  children: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <tr className={cn("border-t border-border/70 bg-muted/20", emphasized ? "font-semibold" : "text-sm")}>{children}</tr>
  );
}
