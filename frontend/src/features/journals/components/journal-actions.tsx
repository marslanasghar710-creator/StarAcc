"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Journal } from "@/features/journals/types";

export function JournalActions({
  journal,
  canUpdate,
  canPost,
  canReverse,
  canVoid,
  onPost,
  onReverse,
  onVoid,
}: {
  journal: Journal;
  canUpdate: boolean;
  canPost: boolean;
  canReverse: boolean;
  canVoid: boolean;
  onPost: () => void;
  onReverse: () => void;
  onVoid: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canUpdate && journal.status === "draft" ? (
        <Button asChild variant="outline">
          <Link href={`/journals/${journal.id}?mode=edit`}>Edit draft</Link>
        </Button>
      ) : null}
      {canPost && journal.status === "draft" ? <Button onClick={onPost}>Post journal</Button> : null}
      {canReverse && journal.status === "posted" ? <Button variant="outline" onClick={onReverse}>Reverse journal</Button> : null}
      {canVoid && journal.status === "draft" ? <Button variant="destructive" onClick={onVoid}>Void draft</Button> : null}
    </div>
  );
}
