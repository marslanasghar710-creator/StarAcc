import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SuggestionDetailPanel } from "@/features/automation/components/suggestion-detail-panel";
import { StructuredDataViewer } from "@/features/automation/components/structured-data-viewer";
import { automationRuleFormSchema, documentExtractionFormSchema, entitySuggestionFormSchema } from "@/features/automation/schemas";

describe("automation form validation", () => {
  it("requires rule identity and valid JSON fields", () => {
    expect(automationRuleFormSchema.safeParse({
      name: "",
      rule_type: "",
      priority: "abc",
      is_active: true,
      description: "",
      entity_type: "",
      trigger_event: "",
      action_type: "",
      conditions_json: "{",
      action_config_json: "{",
    }).success).toBe(false);
  });

  it("requires extraction context and entity suggestion inputs", () => {
    expect(documentExtractionFormSchema.safeParse({ file_id: "", entity_type: "", entity_id: "", document_type: "" }).success).toBe(false);
    expect(entitySuggestionFormSchema.safeParse({ entity_type: "", entity_id: "" }).success).toBe(false);
  });
});

describe("automation explainability UI", () => {
  it("renders structured metadata and suggestion detail", () => {
    render(
      <>
        <StructuredDataViewer data={{ reason: "supplier match", confidence: 98.1, flags: { review_required: true } }} />
        <SuggestionDetailPanel
          suggestion={{
            id: "s1",
            organizationId: "org1",
            suggestionType: "document_coding",
            status: "pending",
            targetEntityType: "bill",
            targetEntityId: "bill_1",
            targetEntityLabel: "Bill BILL-001",
            confidenceScore: 98.1,
            reasonSummary: "Supplier history and line totals matched a known utility expense pattern.",
            reviewRequired: true,
            explanationMetadata: { matched_rules: ["Utilities coding rule"], evidence: { supplier: "Northwind Power" } },
            recommendation: "Suggest account 610 Utilities",
            sourceJobId: "job_1",
            sourceRuleId: "rule_1",
            createdAt: "2026-03-23T10:00:00Z",
            reviewedAt: null,
          }}
          onAccept={async () => {}}
          onReject={async () => {}}
          canReview
        />
      </>,
    );

    expect(screen.getByText(/supplier match/i)).toBeInTheDocument();
    expect(screen.getByText(/Bill BILL-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Suggest account 610 Utilities/i)).toBeInTheDocument();
    expect(screen.getByText(/Utilities coding rule/i)).toBeInTheDocument();
  });
});
