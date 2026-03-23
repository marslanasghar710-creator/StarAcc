import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CustomReportResult } from "@/features/reporting-builder/types";

function stringify(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ReportPreviewTable({ result }: { result: CustomReportResult }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            {result.columns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row, index) => (
            <TableRow key={`preview-row-${index}`}>
              {result.columns.map((column) => <TableCell key={`${index}-${column.key}`}>{stringify(row[column.key])}</TableCell>)}
            </TableRow>
          ))}
          {result.totals ? (
            <TableRow>
              {result.columns.map((column, index) => <TableCell key={`totals-${column.key}`} className="font-medium">{index === 0 ? "Totals" : stringify(result.totals?.[column.key])}</TableCell>)}
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
