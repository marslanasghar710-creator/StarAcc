export const industryPages = {
  founders: {
    title: "For Founders",
    points: ["Fast visibility into cash and profitability", "Serious controls from day one", "Scale from one entity to many"],
  },
  accountants: {
    title: "For Accountants & Bookkeepers",
    points: ["Reliable posting and close controls", "Audit-ready workflows", "Exportable reports for external review"],
  },
  "multi-entity": {
    title: "For Multi-Entity Groups",
    points: ["Consolidation and eliminations", "Cross-entity reporting", "Shared standards with org boundaries"],
  },
  services: {
    title: "For Services Firms",
    points: ["Project profitability", "Invoice and expense operations", "Controller-ready reporting"],
  },
  "inventory-businesses": {
    title: "For Inventory Businesses",
    points: ["Inventory-aware accounting", "Operational purchase/sales flows", "Finance visibility with controls"],
  },
} as const;

export type IndustrySlug = keyof typeof industryPages;
