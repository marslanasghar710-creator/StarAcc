import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomReportField, CustomReportFilter } from "@/features/reporting-builder/types";

export function FilterBuilder({ fields, filters, onChange }: { fields: CustomReportField[]; filters: CustomReportFilter[]; onChange: (next: CustomReportFilter[]) => void }) {
  const addFilter = () => {
    const firstField = fields[0];
    if (!firstField) return;
    onChange([...filters, { field: firstField.key, operator: firstField.filterOperators[0] ?? "eq", value: "" }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Filters</Label>
          <p className="text-xs text-muted-foreground">Operators come from dataset metadata so the UI never invents unsupported query semantics.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addFilter}><Plus className="size-4" />Add filter</Button>
      </div>
      <div className="space-y-2">
        {filters.map((filter, index) => {
          const field = fields.find((entry) => entry.key === filter.field) ?? fields[0];
          const operators = field?.filterOperators ?? ["eq"];
          return (
            <div key={`${filter.field}-${index}`} className="grid gap-2 rounded-lg border border-border/70 p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
              <Select value={filter.field} onValueChange={(value) => onChange(filters.map((entry, currentIndex) => currentIndex === index ? { ...entry, field: value, operator: fields.find((candidate) => candidate.key === value)?.filterOperators[0] ?? "eq" } : entry))}>
                <SelectTrigger><SelectValue placeholder="Field" /></SelectTrigger>
                <SelectContent>{fields.map((entry) => <SelectItem key={entry.key} value={entry.key}>{entry.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filter.operator} onValueChange={(value) => onChange(filters.map((entry, currentIndex) => currentIndex === index ? { ...entry, operator: value as CustomReportFilter["operator"] } : entry))}>
                <SelectTrigger><SelectValue placeholder="Operator" /></SelectTrigger>
                <SelectContent>{operators.map((operator) => <SelectItem key={operator} value={operator}>{operator.replaceAll("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={Array.isArray(filter.value) ? filter.value.join(",") : filter.value ?? ""} placeholder="Value" onChange={(event) => onChange(filters.map((entry, currentIndex) => currentIndex === index ? { ...entry, value: event.target.value } : entry))} disabled={filter.operator === "is_null" || filter.operator === "not_null"} />
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(filters.filter((_, currentIndex) => currentIndex !== index))} aria-label="Remove filter"><Trash2 className="size-4" /></Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
