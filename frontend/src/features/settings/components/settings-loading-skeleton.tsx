import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";

export function SettingsLoadingSkeleton({ blocks = 4 }: { blocks?: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="mt-6 grid gap-3">
        {Array.from({ length: blocks }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
