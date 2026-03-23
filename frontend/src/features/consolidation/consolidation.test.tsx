import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConsolidatedReportTable } from "@/features/consolidation/components/consolidated-report-table";
import { ConsolidationStatusCard } from "@/features/consolidation/components/consolidation-status-card";
import { EliminationEntryTable } from "@/features/consolidation/components/elimination-entry-table";
import { GroupListTable } from "@/features/consolidation/components/group-list-table";
import { createEliminationSchema, createGroupSchema, runConsolidationSchema } from "@/features/consolidation/schemas";

describe("consolidation schemas", () => {
  it("requires a group name", () => {
    expect(createGroupSchema.safeParse({ name: "", reporting_currency: "USD" }).success).toBe(false);
  });

  it("rejects inverted run periods", () => {
    expect(runConsolidationSchema.safeParse({ period_start: "2026-03-31", period_end: "2026-03-01" }).success).toBe(false);
  });

  it("requires elimination lines to balance", () => {
    expect(createEliminationSchema.safeParse({
      description: "Manual",
      period_start: "2026-03-01",
      period_end: "2026-03-31",
      source_entities: ["org-1"],
      journal_lines: [
        { account_code: "4000", account_name: "Sales", account_type: "revenue", debit_amount: "10", credit_amount: "0" },
        { account_code: "5000", account_name: "Expense", account_type: "expense", debit_amount: "0", credit_amount: "9" },
      ],
    }).success).toBe(false);
  });
});

describe("consolidation UI", () => {
  it("renders groups table", () => {
    render(<GroupListTable groups={[{ id: "g1", organization_id: "o1", name: "Group One", reporting_currency: "USD", description: "North America", created_at: "2026-03-01T00:00:00Z", updated_at: "2026-03-10T00:00:00Z" }]} />);
    expect(screen.getByText("Group One")).toBeInTheDocument();
    expect(screen.getByText("North America")).toBeInTheDocument();
  });

  it("renders latest run details", () => {
    render(<ConsolidationStatusCard run={{ id: "run-1", group_id: "group-1", period_start: "2026-03-01", period_end: "2026-03-31", status: "completed", created_at: "2026-03-31T00:00:00Z", completed_at: "2026-03-31T02:00:00Z", selected_entity_ids: [], fx_rates: {}, elimination_summary: { count: 2, auto_count: 1, manual_count: 1 } }} />);
    expect(screen.getByText(/Eliminations: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Open run/i)).toBeInTheDocument();
  });

  it("renders elimination entries", () => {
    render(<EliminationEntryTable entries={[{ id: "e1", group_id: "g1", description: "IC revenue elimination", period_start: "2026-03-01", period_end: "2026-03-31", source_entities: ["o1", "o2"], journal_lines: [{ account_code: "4000", account_name: "Sales", account_type: "revenue", debit_amount: "100", credit_amount: "0" }], is_manual: false, created_at: "2026-03-31T00:00:00Z" }]} />);
    expect(screen.getByText(/IC revenue elimination/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto/i)).toBeInTheDocument();
  });

  it("renders consolidated report lines", () => {
    render(<ConsolidatedReportTable title="Trial balance" lines={[{ account_code: "1000", account_name: "Cash", account_type: "asset", debit_balance: "100", credit_balance: "0", entity_breakdown: [] }]} amountLabel="Balance" />);
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
  });
});
