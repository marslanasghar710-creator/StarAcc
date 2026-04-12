import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PricingPlanGrid } from "@/marketing/components/pricing-plan-grid";

vi.mock("@/features/billing/hooks", () => ({
  usePublicPlans: () => ({
    data: [
      { code: "growth", name: "Growth", pricing: { monthly_price: 49 }, features: { advanced_reporting: true }, limits: { max_invoices_per_month: 500, max_bills_per_month: 500, max_users: 10, max_entities: 5, max_bank_accounts: 5, max_integrations: 3 } },
      { code: "starter", name: "Starter", pricing: { monthly_price: 0 }, features: { advanced_reporting: false }, limits: { max_invoices_per_month: 50, max_bills_per_month: 50, max_users: 2, max_entities: 1, max_bank_accounts: 1, max_integrations: 0 } },
      { code: "pro", name: "Pro", pricing: { monthly_price: 129 }, features: { advanced_reporting: true }, limits: { max_invoices_per_month: "unlimited", max_bills_per_month: "unlimited", max_users: "unlimited", max_entities: "unlimited", max_bank_accounts: "unlimited", max_integrations: "unlimited" } },
    ],
  }),
  useBillingState: () => ({ data: { subscription: { plan_code: "starter" } } }),
  useChangePlan: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/providers/organization-provider", () => ({
  useOrganization: () => ({ currentOrganizationId: null }),
}));

vi.mock("@/features/funnel/analytics", () => ({ trackEvent: vi.fn() }));

describe("PricingPlanGrid", () => {
  it("renders canonical starter/growth/pro plans and dynamic limits", () => {
    render(<PricingPlanGrid />);

    expect(screen.getAllByText("Starter").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Growth").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);

    expect(screen.getByText("Entities")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    expect(screen.getAllByText("Unlimited").length).toBeGreaterThan(0);
  });
});
