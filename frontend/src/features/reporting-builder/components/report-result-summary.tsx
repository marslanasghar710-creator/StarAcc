import { Badge } from "@/components/ui/badge";
import type { CustomReportResult } from "@/features/reporting-builder/types";

export function ReportResultSummary({ result }: { result: CustomReportResult }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Badge variant="secondary">{result.dataset.name}</Badge>
      <span>{result.rowCount} rows</span>
      <span>Page {result.page} of {result.totalPages}</span>
      {result.groupings.length ? <span>Grouped by {result.groupings.map((field) => field.label).join(", ")}</span> : <span>Detail rows</span>}
      {result.execution.executedAt ? <span>Executed {new Date(result.execution.executedAt).toLocaleString()}</span> : null}
    </div>
  );
}
