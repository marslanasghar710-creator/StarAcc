import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BankSuggestion } from "@/features/banking/types";

export function BankSuggestionList({ suggestions, onApply }: { suggestions: BankSuggestion[]; onApply: (suggestion: BankSuggestion) => void; }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Match suggestions</CardTitle>
        <CardDescription>Deterministic backend suggestions only. The frontend does not infer reconciliation matches.</CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? <p className="text-sm text-muted-foreground">No backend suggestions are available for this transaction.</p> : (
          <ul className="space-y-3">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id} className="rounded-lg border border-border/70 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{suggestion.label}</p>
                      <Badge variant="outline" className="capitalize">{suggestion.type.replaceAll("_", " ")}</Badge>
                    </div>
                    {suggestion.reason ? <p className="text-muted-foreground">{suggestion.reason}</p> : null}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {suggestion.score != null ? <span>Score: {suggestion.score}</span> : null}
                      {suggestion.entityType && suggestion.entityId ? <span>{suggestion.entityType} · {suggestion.entityId}</span> : null}
                      {suggestion.amount ? <span>Amount: {suggestion.amount}</span> : null}
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => onApply(suggestion)}>Use suggestion</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
