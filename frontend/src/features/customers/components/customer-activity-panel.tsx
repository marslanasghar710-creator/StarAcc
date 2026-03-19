import { DateDisplay } from "@/components/shared/date-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomerActivityEntry } from "@/features/customers/types";

export function CustomerActivityPanel({ entries }: { entries: CustomerActivityEntry[] }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Operational events returned by the customer activity endpoint.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent customer activity was returned by the backend.</p>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-border/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{entry.title}</p>
                  <span className="text-sm text-muted-foreground"><DateDisplay value={entry.occurredAt} includeTime /></span>
                </div>
                {entry.description ? <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
