import type { PerformanceMetric } from "@/features/observability/types";

export function SlowOperationsTable({ items }: { items: PerformanceMetric[] }) {
  return (
    <div className="overflow-auto rounded border">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="p-2">Operation</th><th>Domain</th><th>Status</th><th>Duration(ms)</th><th>Recorded</th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.metric_id} className="border-b">
              <td className="p-2">{item.operation}</td><td>{item.domain}</td><td>{item.status}</td><td>{Math.round(item.duration_ms)}</td><td>{item.recorded_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
