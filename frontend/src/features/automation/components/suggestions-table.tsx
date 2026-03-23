import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AutomationStatusBadge } from "@/features/automation/components/automation-status-badge";
import type { Suggestion } from "@/features/automation/types";

export function SuggestionsTable({ suggestions, selectedSuggestionId, onSelect }: { suggestions: Suggestion[]; selectedSuggestionId?: string | null; onSelect: (suggestion: Suggestion) => void; }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Target entity</TableHead>
            <TableHead>Suggestion type</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
            <TableHead>Review required</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suggestions.map((suggestion) => (
            <TableRow key={suggestion.id} data-state={selectedSuggestionId === suggestion.id ? "selected" : undefined}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{suggestion.targetEntityLabel || `${suggestion.targetEntityType || "entity"} ${suggestion.targetEntityId || ""}`}</span>
                  <span className="text-xs text-muted-foreground">{suggestion.targetEntityType || "Unknown type"} · {suggestion.targetEntityId || "Unknown ID"}</span>
                </div>
              </TableCell>
              <TableCell className="capitalize">{suggestion.suggestionType.replaceAll("_", " ")}</TableCell>
              <TableCell className="text-right tabular-nums">{suggestion.confidenceScore != null ? `${suggestion.confidenceScore.toFixed(1)}%` : "—"}</TableCell>
              <TableCell>{suggestion.reviewRequired ? "Yes" : "No"}</TableCell>
              <TableCell><AutomationStatusBadge value={suggestion.status} /></TableCell>
              <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => onSelect(suggestion)}>Inspect</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
