import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomReportField, CustomReportSort } from "@/features/reporting-builder/types";

export function SortingBuilder({ fields, sorting, onChange }: { fields: CustomReportField[]; sorting: CustomReportSort[]; onChange: (next: CustomReportSort[]) => void }) {
  const addSort = () => {
    const firstField = fields[0];
    if (!firstField) return;
    onChange([...sorting, { field: firstField.key, direction: "asc" }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Sorting</Label>
          <p className="text-xs text-muted-foreground">Sorting stays stable because the backend validates sort fields against dataset metadata.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSort}><Plus className="size-4" />Add sort</Button>
      </div>
      {sorting.map((sort, index) => (
        <div key={`${sort.field}-${index}`} className="grid gap-2 rounded-lg border border-border/70 p-3 md:grid-cols-[1fr_180px_auto]">
          <Select value={sort.field} onValueChange={(value) => onChange(sorting.map((entry, currentIndex) => currentIndex === index ? { ...entry, field: value } : entry))}>
            <SelectTrigger><SelectValue placeholder="Sort field" /></SelectTrigger>
            <SelectContent>{fields.map((field) => <SelectItem key={field.key} value={field.key}>{field.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sort.direction} onValueChange={(value) => onChange(sorting.map((entry, currentIndex) => currentIndex === index ? { ...entry, direction: value as CustomReportSort["direction"] } : entry))}>
            <SelectTrigger><SelectValue placeholder="Direction" /></SelectTrigger>
            <SelectContent><SelectItem value="asc">Ascending</SelectItem><SelectItem value="desc">Descending</SelectItem></SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(sorting.filter((_, currentIndex) => currentIndex !== index))}><Trash2 className="size-4" /></Button>
        </div>
      ))}
    </div>
  );
}
