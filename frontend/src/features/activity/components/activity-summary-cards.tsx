import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityCenterResponse } from "@/features/activity/types";

export function ActivitySummaryCards({ summary }: { summary: ActivityCenterResponse }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Total events</CardTitle>
          <CardDescription>Filtered audit rows returned by the backend.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-2xl font-semibold tabular-nums">{summary.totalCount}</p></CardContent>
      </Card>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Actors</CardTitle>
          <CardDescription>Distinct users represented in the current result set.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-2xl font-semibold tabular-nums">{summary.actorCount}</p></CardContent>
      </Card>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Distinct action codes in the current audit slice.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-2xl font-semibold tabular-nums">{summary.actionCount}</p></CardContent>
      </Card>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Entity types</CardTitle>
          <CardDescription>Distinct domain entity families represented.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-2xl font-semibold tabular-nums">{summary.entityTypeCount}</p></CardContent>
      </Card>
    </div>
  );
}
