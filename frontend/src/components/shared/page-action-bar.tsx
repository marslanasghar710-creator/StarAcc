import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageActionBar({ left, right, className }: { left?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between", className)}>
      <div className="flex flex-1 flex-wrap items-center gap-3">{left}</div>
      {right ? <div className="flex flex-wrap items-center justify-end gap-2">{right}</div> : null}
    </div>
  );
}
