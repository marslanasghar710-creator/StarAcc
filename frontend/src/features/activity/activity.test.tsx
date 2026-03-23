import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActivityFacetCard } from "@/features/activity/components/activity-facet-card";
import { ActivityLogTable } from "@/features/activity/components/activity-log-table";
import { ActivitySummaryCards } from "@/features/activity/components/activity-summary-cards";
import { activityCenterFilterSchema } from "@/features/activity/schemas";

describe("activity center filters", () => {
  it("rejects inverted date ranges and invalid emails", () => {
    expect(activityCenterFilterSchema.safeParse({ actorEmail: "not-an-email", createdFrom: "2026-03-23T12:00:00Z", createdTo: "2026-03-22T12:00:00Z" }).success).toBe(false);
  });

  it("accepts optional filters when values are consistent", () => {
    expect(activityCenterFilterSchema.safeParse({ q: "invoice", actorEmail: "owner@example.com", createdFrom: "2026-03-22T12:00:00Z", createdTo: "2026-03-23T12:00:00Z" }).success).toBe(true);
  });
});

describe("activity center UI", () => {
  it("renders summary cards, facets, and audit rows", () => {
    render(
      <>
        <ActivitySummaryCards summary={{
          items: [],
          totalCount: 12,
          actorCount: 3,
          actionCount: 4,
          entityTypeCount: 2,
          topActions: [],
          topEntityTypes: [],
          hasMore: false,
          appliedLimit: 100,
        }} />
        <ActivityFacetCard title="Top actions" description="Most frequent actions" items={[{ value: "invoice.created", count: 5 }]} />
        <ActivityLogTable items={[{
          id: "log-1",
          action: "invoice.created",
          entityType: "invoice",
          entityId: "inv-1",
          actorEmail: "owner@example.com",
          actorUserId: "user-1",
          metadataJson: { invoice_number: "INV-1001" },
          ipAddress: "127.0.0.1",
          createdAt: "2026-03-23T10:00:00Z",
        }]} />
      </>,
    );

    expect(screen.getByText("Total events")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("invoice.created")).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText(/INV-1001/i)).toBeInTheDocument();
  });
});
