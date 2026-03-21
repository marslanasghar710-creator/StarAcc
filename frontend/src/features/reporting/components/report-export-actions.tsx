import * as React from "react";

import { Download, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ReportFormat } from "@/features/reporting/types";

export function ReportExportActions({
  canExport,
  isExporting,
  onExport,
}: {
  canExport: boolean;
  isExporting?: boolean;
  onExport: (format: ReportFormat) => void;
}) {
  if (!canExport) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={() => onExport("csv")} disabled={isExporting}>
        <FileSpreadsheet className="size-4" />
        Export CSV
      </Button>
      <Button type="button" variant="outline" onClick={() => onExport("pdf")} disabled={isExporting}>
        <Download className="size-4" />
        Export PDF
      </Button>
    </div>
  );
}
