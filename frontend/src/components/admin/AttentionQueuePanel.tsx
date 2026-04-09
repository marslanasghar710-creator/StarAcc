import type { AttentionQueueItem } from "@/features/observability/types";

export function AttentionQueuePanel({ items }: { items: AttentionQueueItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.item_id} className="rounded border p-3 text-sm">
          <p className="font-medium">{item.title} · {item.severity}</p>
          <p className="text-muted-foreground">{item.description}</p>
          <p className="text-xs text-muted-foreground">{item.created_at}</p>
        </div>
      ))}
    </div>
  );
}
