import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";

export function ReportLoadingSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
