import * as React from "react";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FiscalPeriodRecord } from "@/features/settings/types";

export function ReopenPeriodDialog({ open, onOpenChange, period, onConfirm, isSubmitting, error }: { open: boolean; onOpenChange: (open: boolean) => void; period?: FiscalPeriodRecord | null; onConfirm: () => Promise<void>; isSubmitting?: boolean; error?: string | null; }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reopen fiscal period</DialogTitle>
          <DialogDescription>Reopening a period is operationally sensitive. The backend decides whether reopening is allowed.</DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm"><AlertTriangle className="mb-2 size-4" />Reopening {period?.name || "this period"} may allow additional postings or corrections. Confirm only if this is intended.</div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={isSubmitting}>{isSubmitting ? "Reopening…" : "Reopen period"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
