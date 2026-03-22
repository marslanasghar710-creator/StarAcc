import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { adaptAsset } from "@/features/assets/adapters";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import { assetCategoryFormSchema, assetDisposalFormSchema, assetFormSchema } from "@/features/assets/schemas";

describe("asset schemas", () => {
  it("validates fixed asset and category forms", () => {
    expect(assetCategoryFormSchema.safeParse({
      name: "Computer equipment",
      default_useful_life_months: "36",
      depreciation_method: "straight_line",
      asset_account_id: "",
      accumulated_depreciation_account_id: "",
      depreciation_expense_account_id: "",
    }).success).toBe(true);

    expect(assetFormSchema.safeParse({
      name: "Laptop fleet",
      description: "",
      asset_category_id: "",
      acquisition_date: "2026-03-22",
      acquisition_cost: "4500.00",
      useful_life_months: "36",
      depreciation_method: "straight_line",
      residual_value: "500.00",
      depreciation_start_date: "2026-04-01",
    }).success).toBe(true);

    expect(assetDisposalFormSchema.safeParse({
      disposal_date: "",
      disposal_proceeds: "100.00",
      notes: "Sold",
    }).success).toBe(false);
  });
});

describe("asset adapters and UI", () => {
  it("adapts raw asset payloads and renders status badges", () => {
    const asset = adaptAsset({
      id: "asset-1",
      name: "Vehicle",
      acquisition_cost: "25000.00",
      accumulated_depreciation: "5000.00",
      net_book_value: "20000.00",
      depreciation_method: "straight_line",
      status: "active",
    });

    expect(asset.netBookValue).toBe("20000.00");

    render(<AssetStatusBadge value="fully_depreciated" />);
    expect(screen.getByText(/fully depreciated/i)).toBeInTheDocument();
  });
});
