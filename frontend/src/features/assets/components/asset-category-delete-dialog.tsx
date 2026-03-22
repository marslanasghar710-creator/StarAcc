"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AssetCategory } from "@/features/assets/types";

export function AssetCategoryDeleteDialog({
  open,
  onOpenChange,
  category,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: AssetCategory | null;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}) {
  if (!category) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete {category.name}?</DialogTitle>
          <DialogDescription>
            Remove this asset category through the backend contract. Existing assets should be reviewed first so you do not orphan expected defaults.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={() => void onConfirm()} disabled={isSubmitting}>
            {isSubmitting ? "Deleting…" : "Delete category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
