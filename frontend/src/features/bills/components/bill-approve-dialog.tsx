import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BillApproveDialog({ open, onOpenChange, onConfirm, isSubmitting, error }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => Promise<void>; isSubmitting?: boolean; error?: string | null; }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve bill</DialogTitle>
          <DialogDescription>Approval confirms the bill is ready for downstream AP controls and posting checks.</DialogDescription>
        </DialogHeader>
        <InlineValidationMessage message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void onConfirm()} disabled={isSubmitting}>{isSubmitting ? "Approving…" : "Approve bill"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
