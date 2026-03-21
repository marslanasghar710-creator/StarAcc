"use client";

import * as React from "react";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ReconcileMatchJournalDialog({ open, onOpenChange, options, onConfirm, isSubmitting, error }: { open: boolean; onOpenChange: (open: boolean) => void; options: Array<{ id: string; label: string }>; onConfirm: (id: string) => Promise<void>; isSubmitting?: boolean; error?: string | null; }) {
  const [selectedId, setSelectedId] = React.useState("");
  React.useEffect(() => { if (!open) setSelectedId(""); }, [open]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Match journal</DialogTitle><DialogDescription>Select a posted journal that already reflects this cash movement.</DialogDescription></DialogHeader><InlineValidationMessage message={error} /><Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger><SelectValue placeholder="Select journal" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => void onConfirm(selectedId)} disabled={isSubmitting || !selectedId}>{isSubmitting ? "Reconciling…" : "Confirm journal match"}</Button></DialogFooter></DialogContent></Dialog>;
}
