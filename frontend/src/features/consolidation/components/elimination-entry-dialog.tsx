"use client";

import { useState } from "react";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createEliminationSchema } from "@/features/consolidation/schemas";
import type { GroupEntity } from "@/features/consolidation/types";

const defaultLines = [
  { account_code: "", account_name: "", account_type: "revenue", debit_amount: "0", credit_amount: "0" },
  { account_code: "", account_name: "", account_type: "expense", debit_amount: "0", credit_amount: "0" },
] as const;

export function EliminationEntryDialog({
  entities,
  onCreate,
}: {
  entities: GroupEntity[];
  onCreate: (payload: { description: string; period_start: string; period_end: string; source_entities: string[]; journal_lines: Array<Record<string, string>> }) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [lines, setLines] = useState(defaultLines.map((line) => ({ ...line })));
  const source_entities = entities.map((entity) => entity.organization_id);
  const validation = createEliminationSchema.safeParse({ description, period_start: periodStart, period_end: periodEnd, source_entities, journal_lines: lines });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Manual elimination</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create elimination adjustment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Input placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
            <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </div>
          {lines.map((line, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-5">
              <Input placeholder="Account code" value={line.account_code} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, account_code: event.target.value } : item))} />
              <Input placeholder="Account name" value={line.account_name} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, account_name: event.target.value } : item))} />
              <Input placeholder="Account type" value={line.account_type} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, account_type: event.target.value } : item))} />
              <Input placeholder="Debit" value={line.debit_amount} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, debit_amount: event.target.value } : item))} />
              <Input placeholder="Credit" value={line.credit_amount} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, credit_amount: event.target.value } : item))} />
            </div>
          ))}
          {!validation.success ? <InlineValidationMessage message={validation.error.issues[0]?.message ?? "Entry is invalid"} /> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!validation.success}
              onClick={async () => {
                await onCreate({ description, period_start: periodStart, period_end: periodEnd, source_entities, journal_lines: lines });
                setOpen(false);
              }}
            >
              Save elimination
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
