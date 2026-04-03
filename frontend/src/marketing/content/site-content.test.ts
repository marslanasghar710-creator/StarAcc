import { describe, expect, it } from "vitest";

import { faqItems, navigationLinks, pricingPlans, primaryCtas } from "@/marketing/content/site-content";

describe("public GTM content", () => {
  it("keeps CTA links resolvable", () => {
    const hrefs = [primaryCtas.primary.href, primaryCtas.secondary.href, ...navigationLinks.map((item) => item.href), ...pricingPlans.map((plan) => plan.cta.href)];
    for (const href of hrefs) {
      expect(href.startsWith("/")).toBe(true);
    }
  });

  it("provides non-empty FAQ entries", () => {
    expect(faqItems.length).toBeGreaterThan(4);
    for (const item of faqItems) {
      expect(item.q.length).toBeGreaterThan(10);
      expect(item.a.length).toBeGreaterThan(10);
    }
  });
});
