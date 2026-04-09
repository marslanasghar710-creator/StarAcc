"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UpgradeCTA } from "@/components/entitlements/upgrade-cta";

export function LimitReachedModal({ open, onOpenChange, limitKey }: { open: boolean; onOpenChange: (open: boolean) => void; limitKey: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usage limit reached</DialogTitle>
          <DialogDescription>
            You reached the <strong>{limitKey}</strong> limit for your current plan.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-2">
          <UpgradeCTA label="Upgrade plan" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
