import type { JobExecutionRecord } from "@/features/observability/types";

export function JobStatusTable({ items }: { items: JobExecutionRecord[] }) {
  return (
    <div className="overflow-auto rounded border">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="p-2">Job</th><th>Status</th><th>Started</th><th>Duration(ms)</th><th>Error</th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.job_execution_id} className="border-b">
              <td className="p-2">{item.job_type}</td><td>{item.status}</td><td>{item.started_at}</td><td>{item.duration_ms ?? "-"}</td><td>{item.error_code ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
