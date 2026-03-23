import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CustomReportExportFormat } from "@/features/reporting-builder/types";

export function ReportExportActions({ canExport, isExporting, onExport }: { canExport: boolean; isExporting?: boolean; onExport: (format: CustomReportExportFormat) => void }) {
  if (!canExport) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => onExport("csv")} disabled={isExporting}><Download className="size-4" />Export CSV</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => onExport("pdf")} disabled={isExporting}><Download className="size-4" />Export PDF</Button>
    </div>
  );
}
