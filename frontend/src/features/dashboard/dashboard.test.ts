import { describe, expect, it } from "vitest";

import { dashboardWidgetRegistry, resolveWidgets } from "@/features/dashboard/widget-registry";

describe("dashboard widget registry", () => {
  it("contains the expected command-center widgets", () => {
    expect(dashboardWidgetRegistry.map((w) => w.key)).toEqual([
      "summary_strip",
      "attention_center",
      "trend",
      "aging",
      "workflows",
      "recent_activity",
      "recommendations",
    ]);
  });

  it("hides mature-only widgets for new organizations", () => {
    const widgets = resolveWidgets("new", () => true);
    expect(widgets.some((w) => w.key === "trend")).toBe(false);
    expect(widgets.some((w) => w.key === "aging")).toBe(false);
  });

  it("shows trend and aging widgets for active organizations", () => {
    const widgets = resolveWidgets("active", () => true);
    expect(widgets.some((w) => w.key === "trend")).toBe(true);
    expect(widgets.some((w) => w.key === "aging")).toBe(true);
  });
});
