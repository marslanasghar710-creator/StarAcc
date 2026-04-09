import type { ErrorRecord } from "@/features/observability/types";

export function ErrorFeed({ items }: { items: ErrorRecord[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.error_id} className="rounded border p-3 text-sm">
          <p className="font-medium">{item.error_code} · {item.severity}</p>
          <p className="text-muted-foreground">{item.message}</p>
          <p className="text-xs text-muted-foreground">{item.occurred_at}</p>
        </div>
      ))}
    </div>
  );
}
