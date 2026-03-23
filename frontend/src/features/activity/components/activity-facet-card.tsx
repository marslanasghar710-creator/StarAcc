import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditFacetCount } from "@/features/activity/types";

export function ActivityFacetCard({ title, description, items }: { title: string; description: string; items: AuditFacetCount[] }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No grouped activity is available for the current filters.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={`${title}-${item.value ?? "unknown"}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
                <span className="truncate text-sm font-medium text-foreground">{item.value ?? "Unknown"}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
