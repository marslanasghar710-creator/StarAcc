"use client";

import * as React from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineValidationMessage } from "@/components/shared/inline-validation-message";

export function InvoiceVoidDialog({ open, onOpenChange, onConfirm, isSubmitting, error }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: (reason: string) => Promise<void>; isSubmitting?: boolean; error?: string | null; }) {
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void invoice</DialogTitle>
          <DialogDescription>Voiding closes the invoice and is subject to backend restrictions such as payment allocations.</DialogDescription>
        </DialogHeader>
        <InlineValidationMessage message={error} />
        <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for voiding" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => void onConfirm(reason)} disabled={isSubmitting}>{isSubmitting ? "Voiding…" : "Void invoice"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
