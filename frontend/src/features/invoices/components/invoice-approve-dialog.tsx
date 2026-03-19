"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InlineValidationMessage } from "@/components/shared/inline-validation-message";

export function InvoiceApproveDialog({ open, onOpenChange, onConfirm, isSubmitting, error }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => Promise<void>; isSubmitting?: boolean; error?: string | null; }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve invoice</DialogTitle>
          <DialogDescription>Approval moves the invoice out of draft and prepares it for sending or posting, subject to backend validation.</DialogDescription>
        </DialogHeader>
        <InlineValidationMessage message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void onConfirm()} disabled={isSubmitting}>{isSubmitting ? "Approving…" : "Approve invoice"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
