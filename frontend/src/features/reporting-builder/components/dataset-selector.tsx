import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomReportDatasetSummary } from "@/features/reporting-builder/types";

export function DatasetSelector({ datasets, value, onChange, disabled }: { datasets: CustomReportDatasetSummary[]; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>Dataset</Label>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select a dataset" />
        </SelectTrigger>
        <SelectContent>
          {datasets.map((dataset) => (
            <SelectItem key={dataset.id} value={dataset.id}>
              {dataset.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value ? <p className="text-xs text-muted-foreground">The backend owns dataset structure, allowed fields, and validation.</p> : null}
    </div>
  );
}
