import * as React from "react";

import { Filter } from "lucide-react";

import { PageActionBar } from "@/components/shared/page-action-bar";

export function ReportFilterBar({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <PageActionBar
      left={
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="size-4" />
            Backend-driven filters
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
        </>
      }
      right={actions}
    />
  );
}
