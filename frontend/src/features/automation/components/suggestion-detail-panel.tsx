import { DateDisplay } from "@/components/shared/date-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationStatusBadge } from "@/features/automation/components/automation-status-badge";
import { StructuredDataViewer } from "@/features/automation/components/structured-data-viewer";
import type { Suggestion } from "@/features/automation/types";

export function SuggestionDetailPanel({ suggestion, onAccept, onReject, canReview, isAccepting, isRejecting }: { suggestion: Suggestion; onAccept: () => Promise<void>; onReject: () => Promise<void>; canReview: boolean; isAccepting?: boolean; isRejecting?: boolean; }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Suggestion detail</CardTitle>
        <CardDescription>Explainability comes first: inspect the recommendation, reason summary, confidence, and metadata before reviewing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-sm text-muted-foreground">Suggestion type</p><p className="mt-1 font-medium capitalize">{suggestion.suggestionType.replaceAll("_", " ")}</p></div>
          <div><p className="text-sm text-muted-foreground">Confidence score</p><p className="mt-1 font-medium">{suggestion.confidenceScore != null ? `${suggestion.confidenceScore.toFixed(1)}%` : "—"}</p></div>
          <div><p className="text-sm text-muted-foreground">Status</p><div className="mt-1"><AutomationStatusBadge value={suggestion.status} /></div></div>
          <div><p className="text-sm text-muted-foreground">Review required</p><p className="mt-1 font-medium">{suggestion.reviewRequired ? "Yes" : "No"}</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><p className="text-sm text-muted-foreground">Target entity</p><p className="mt-1 text-sm">{suggestion.targetEntityLabel || "Unknown target"}</p><p className="text-xs text-muted-foreground">{suggestion.targetEntityType || "Unknown type"} · {suggestion.targetEntityId || "Unknown ID"}</p></div>
          <div><p className="text-sm text-muted-foreground">Recommendation</p><p className="mt-1 text-sm">{suggestion.recommendation || "No explicit recommendation returned."}</p></div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Reason summary</p>
          <p className="mt-1 text-sm">{suggestion.reasonSummary || "No reason summary returned."}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><p className="text-sm text-muted-foreground">Created</p><p className="mt-1 text-sm"><DateDisplay value={suggestion.createdAt} includeTime /></p></div>
          <div><p className="text-sm text-muted-foreground">Reviewed</p><p className="mt-1 text-sm"><DateDisplay value={suggestion.reviewedAt} includeTime /></p></div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Explanation metadata</p>
          <StructuredDataViewer data={suggestion.explanationMetadata} emptyLabel="No explanation metadata returned." className="mt-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!canReview || isAccepting} onClick={() => void onAccept()}>{isAccepting ? "Accepting…" : "Accept suggestion"}</Button>
          <Button variant="destructive" disabled={!canReview || isRejecting} onClick={() => void onReject()}>{isRejecting ? "Rejecting…" : "Reject suggestion"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
