import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BillPostDialog({ open, onOpenChange, onConfirm, isSubmitting, error }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => Promise<void>; isSubmitting?: boolean; error?: string | null; }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post bill</DialogTitle>
          <DialogDescription>Posting creates accounting impact and may make the bill financially immutable depending on backend rules and period state.</DialogDescription>
        </DialogHeader>
        <InlineValidationMessage message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void onConfirm()} disabled={isSubmitting}>{isSubmitting ? "Posting…" : "Post bill"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
