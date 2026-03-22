import * as React from "react";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FiscalPeriodRecord } from "@/features/settings/types";

export function ClosePeriodDialog({ open, onOpenChange, period, onConfirm, isSubmitting, error }: { open: boolean; onOpenChange: (open: boolean) => void; period?: FiscalPeriodRecord | null; onConfirm: () => Promise<void>; isSubmitting?: boolean; error?: string | null; }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close fiscal period</DialogTitle>
          <DialogDescription>Closing a period may restrict posting and edits. The backend remains authoritative for all lock rules.</DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><AlertTriangle className="mb-2 size-4 text-amber-700" />You are about to close {period?.name || "this fiscal period"}. Make sure all expected postings are complete.</div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={() => void onConfirm()} disabled={isSubmitting}>{isSubmitting ? "Closing…" : "Close period"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
