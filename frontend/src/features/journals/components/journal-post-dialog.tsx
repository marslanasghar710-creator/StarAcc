"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InlineValidationMessage } from "@/components/shared/inline-validation-message";

export function JournalPostDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post journal</DialogTitle>
          <DialogDescription>Posting will make the journal immutable and subject to period and validation controls on the backend.</DialogDescription>
        </DialogHeader>
        <InlineValidationMessage message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void onConfirm()} disabled={isSubmitting}>{isSubmitting ? "Posting…" : "Post journal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
