import * as React from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomReportVisibility } from "@/features/reporting-builder/types";

export function SavedReportFormDialog({ triggerLabel, initialName = "", initialDescription = "", initialVisibility = "private", onSubmit }: { triggerLabel: string; initialName?: string; initialDescription?: string; initialVisibility?: CustomReportVisibility; onSubmit: (values: { name: string; description: string; visibility: CustomReportVisibility }) => Promise<void> | void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(initialName);
  const [description, setDescription] = React.useState(initialDescription);
  const [visibility, setVisibility] = React.useState<CustomReportVisibility>(initialVisibility);

  React.useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setVisibility(initialVisibility);
    }
  }, [initialDescription, initialName, initialVisibility, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button">{triggerLabel}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save custom report</DialogTitle>
          <DialogDescription>Saved definitions stay backend-owned so report truth, validation, and exports remain auditable.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="report-name">Name</Label><Input id="report-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="report-description">Description</Label><Textarea id="report-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(value) => setVisibility(value as CustomReportVisibility)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" onClick={async () => { await onSubmit({ name, description, visibility }); setOpen(false); }} disabled={!name.trim()}>Save report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
