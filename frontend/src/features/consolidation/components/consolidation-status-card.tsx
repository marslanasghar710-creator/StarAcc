import Link from "next/link";

import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import type { ConsolidationRun } from "@/features/consolidation/types";

export function ConsolidationStatusCard({ run }: { run?: ConsolidationRun | null }) {
  if (!run) {
    return <SectionCard title="Latest run" description="No consolidation has been executed for this group yet."><p className="text-sm text-muted-foreground">Run consolidation to produce group-level statements and elimination snapshots.</p></SectionCard>;
  }

  return (
    <SectionCard title="Latest run" description={`Reporting period ${run.period_start} to ${run.period_end}`}>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge>{run.status}</Badge>
        <span>Eliminations: {run.elimination_summary?.count ?? 0}</span>
        <span>Completed: {run.completed_at ? new Date(run.completed_at).toLocaleString() : "In progress"}</span>
        <Link href={`/consolidation/runs/${run.id}?groupId=${run.group_id}`} className="font-medium text-primary underline-offset-4 hover:underline">Open run</Link>
      </div>
    </SectionCard>
  );
}
