import * as React from "react";

import { FileBarChart2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { DateDisplay } from "@/components/shared/date-display";
import { Badge } from "@/components/ui/badge";
import { ReportsNav } from "@/features/reporting/components/reports-nav";
import type { ReportsLandingItem } from "@/features/reporting/types";

export function ReportPageHeader({
  title,
  description,
  eyebrow,
  reports,
  activeHref,
  generatedAt,
  actions,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  reports: ReportsLandingItem[];
  activeHref: string;
  generatedAt?: string | null;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={eyebrow ?? "Reporting"}
        title={title}
        description={description}
        actions={
          <>
            <Badge variant="outline">
              <FileBarChart2 className="mr-1 size-3.5" />
              Backend source of truth
            </Badge>
            {generatedAt ? <Badge variant="secondary">Generated <DateDisplay value={generatedAt} includeTime /></Badge> : null}
            {actions}
          </>
        }
      />
      <ReportsNav reports={reports} activeHref={activeHref} compact />
    </div>
  );
}
