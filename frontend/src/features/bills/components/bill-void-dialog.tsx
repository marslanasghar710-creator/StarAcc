"use client";

import * as React from "react";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function BillVoidDialog({ open, onOpenChange, onConfirm, isSubmitting, error }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: (reason: string) => Promise<void>; isSubmitting?: boolean; error?: string | null; }) {
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void bill</DialogTitle>
          <DialogDescription>Voiding stops further AP workflow activity. Historical audit visibility is retained by the backend.</DialogDescription>
        </DialogHeader>
        <InlineValidationMessage message={error} />
        <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for voiding" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => void onConfirm(reason)} disabled={isSubmitting}>{isSubmitting ? "Voiding…" : "Void bill"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
