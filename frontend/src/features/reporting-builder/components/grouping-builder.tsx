import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomReportField } from "@/features/reporting-builder/types";

export function GroupingBuilder({ fields, groupings, onChange }: { fields: CustomReportField[]; groupings: string[]; onChange: (next: string[]) => void }) {
  const addGrouping = () => {
    const firstField = fields.find((field) => !groupings.includes(field.key));
    if (!firstField) return;
    onChange([...groupings, firstField.key]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Grouping</Label>
          <p className="text-xs text-muted-foreground">Group by backend-supported dimensions when you want subtotals and summarized output.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addGrouping}><Plus className="size-4" />Add grouping</Button>
      </div>
      {groupings.map((grouping, index) => (
        <div key={`${grouping}-${index}`} className="grid gap-2 rounded-lg border border-border/70 p-3 md:grid-cols-[1fr_auto]">
          <Select value={grouping} onValueChange={(value) => onChange(groupings.map((entry, currentIndex) => currentIndex === index ? value : entry))}>
            <SelectTrigger><SelectValue placeholder="Grouping field" /></SelectTrigger>
            <SelectContent>{fields.map((field) => <SelectItem key={field.key} value={field.key}>{field.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(groupings.filter((_, currentIndex) => currentIndex !== index))}><Trash2 className="size-4" /></Button>
        </div>
      ))}
    </div>
  );
}
