import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JournalStatusBadge } from "@/features/journals/components/journal-status-badge";
import type { Journal } from "@/features/journals/types";
import type { Period } from "@/features/periods/types";

export function JournalDetailPanel({ journal, period }: { journal: Journal; period: Period | null }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Journal metadata</CardTitle>
        <CardDescription>Immutable audit data comes from the accounting backend.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <JournalStatusBadge status={journal.status} />
          {period ? <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{period.name}</span> : null}
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Entry number</dt>
            <dd className="mt-1 font-medium">{journal.entryNumber}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Entry date</dt>
            <dd className="mt-1"><DateDisplay value={journal.entryDate} /></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Reference</dt>
            <dd className="mt-1">{journal.reference || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Period</dt>
            <dd className="mt-1">{period?.name || journal.periodName || journal.periodId || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Source module</dt>
            <dd className="mt-1">{journal.sourceModule || <span className="text-muted-foreground">Manual</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Source type</dt>
            <dd className="mt-1">{journal.sourceType || <span className="text-muted-foreground">Journal</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Source id</dt>
            <dd className="mt-1 break-all">{journal.sourceId || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Created by</dt>
            <dd className="mt-1 break-all">{journal.createdBy || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Posted by</dt>
            <dd className="mt-1 break-all">{journal.postedBy || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Posted at</dt>
            <dd className="mt-1"><DateDisplay value={journal.postedAt} includeTime /></dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap">{journal.description}</dd>
          </div>
        </dl>
        {(journal.reversalJournalId || journal.reversedFromJournalId) ? (
          <div className="flex flex-wrap gap-4 text-sm">
            {journal.reversalJournalId ? <Button asChild variant="link" className="h-auto px-0 py-0"><Link href={`/journals/${journal.reversalJournalId}`}>View reversal journal</Link></Button> : null}
            {journal.reversedFromJournalId ? <Button asChild variant="link" className="h-auto px-0 py-0"><Link href={`/journals/${journal.reversedFromJournalId}`}>View original journal</Link></Button> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
