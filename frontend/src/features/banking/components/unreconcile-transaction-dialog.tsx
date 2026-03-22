import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function UnreconcileTransactionDialog({ open, onOpenChange, onConfirm, isSubmitting, error }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => Promise<void>; isSubmitting?: boolean; error?: string | null; }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Unreconcile transaction</DialogTitle><DialogDescription>This may unwind previously linked reconciliation or accounting effects. The backend remains the source of truth for what can be reversed safely.</DialogDescription></DialogHeader>{error ? <p className="text-sm text-destructive">{error}</p> : null}<div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm"><AlertTriangle className="mb-2 size-4 text-destructive" />Only proceed if you intend to move this transaction back into the unreconciled queue.</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" onClick={() => void onConfirm()} disabled={isSubmitting}>{isSubmitting ? "Unreconciling…" : "Unreconcile"}</Button></DialogFooter></DialogContent></Dialog>;
}
