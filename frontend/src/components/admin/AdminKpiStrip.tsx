import type { AdminOverview } from "@/features/observability/types";

export function AdminKpiStrip({ overview }: { overview: AdminOverview }) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <div className="rounded border p-3 text-sm"><p className="text-muted-foreground">Platform status</p><p className="font-semibold">{overview.platform_health.overall_status}</p></div>
      <div className="rounded border p-3 text-sm"><p className="text-muted-foreground">Attention items</p><p className="font-semibold">{overview.attention_queue.length}</p></div>
      <div className="rounded border p-3 text-sm"><p className="text-muted-foreground">Recent errors</p><p className="font-semibold">{overview.recent_errors.length}</p></div>
      <div className="rounded border p-3 text-sm"><p className="text-muted-foreground">Slow operations</p><p className="font-semibold">{overview.top_slow_operations.length}</p></div>
      <div className="rounded border p-3 text-sm"><p className="text-muted-foreground">Alert candidates</p><p className="font-semibold">{overview.alert_candidates.length}</p></div>
    </div>
  );
}
