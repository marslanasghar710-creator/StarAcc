import { Label } from "@/components/ui/label";
import type { CustomReportField } from "@/features/reporting-builder/types";

export function FieldPicker({ fields, selected, onToggle }: { fields: CustomReportField[]; selected: string[]; onToggle: (fieldKey: string) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Columns</Label>
        <p className="text-xs text-muted-foreground">Pick the dimensions and metrics to send to preview, save, and export.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => {
          const checked = selected.includes(field.key);
          return (
            <label key={field.key} className="flex items-start gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm">
              <input type="checkbox" checked={checked} onChange={() => onToggle(field.key)} className="mt-0.5" />
              <span>
                <span className="block font-medium">{field.label}</span>
                <span className="text-xs text-muted-foreground">{field.kind} · {field.dataType}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
