export type Cta = { label: string; href: string; event: string };

export const primaryCtas: { primary: Cta; secondary: Cta } = {
  primary: { label: "Start Workspace", href: "/signup?intent=start_workspace", event: "cta_start_workspace" },
  secondary: { label: "Explore Demo", href: "/demo", event: "cta_explore_demo" },
};

export const navigationLinks = [
  { label: "Features", href: "/features/accounting-core" },
  { label: "Demo", href: "/demo" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
  { label: "FAQ", href: "/#faq" },
];

export const capabilityPillars = [
  { title: "Accounting Core", body: "Chart of accounts, journals, period controls, and backend-authoritative posting workflows." },
  { title: "Operational Workflows", body: "Invoices, bills, bank accounts, transaction matching, and reconciliation operations." },
  { title: "Financial Visibility", body: "P&L, balance sheet, trial balance, exports, and custom reporting surfaces." },
  { title: "Controls & Auditability", body: "RBAC, activity center, immutable-first records, and organization isolation boundaries." },
  { title: "Automation", body: "Rules, extraction jobs, AI suggestions, and reviewable explainability metadata." },
  { title: "Multi-Entity Scale", body: "Group structures, eliminations, and consolidated reporting workflows." },
];

export const faqItems = [
  {
    q: "What type of businesses is StarAcc built for?",
    a: "Teams that need serious accounting controls: operators, bookkeepers, finance managers, and multi-entity groups.",
  },
  { q: "Can I explore with demo data first?", a: "Yes. The public demo entry uses isolated seeded sample data paths and never touches customer ledgers." },
  { q: "Does StarAcc support multi-entity accounting?", a: "Yes. Consolidation groups, elimination entries, and consolidated runs are available in-platform." },
  { q: "How are permissions handled?", a: "Access is role-based with organization scoping, so workflows and data stay boundary-safe." },
  { q: "Does it support reports and exports?", a: "Yes. Core financial reports and export workflows are built in for operational handoff and review." },
  { q: "How do onboarding and setup work?", a: "Signup routes into real authentication, organization context, and guided onboarding paths." },
];

export const pricingPlans = [
  { name: "Starter", price: "$0", period: "/month", description: "Single-entity accounting foundation for early operators.", highlights: ["GL + AR/AP", "Banking + reconciliation", "Core reports + exports"], cta: { label: "Start Starter", href: "/signup?intent=start_workspace", event: "pricing_starter" } },
  { name: "Growth", price: "$49", period: "/month", description: "Operational accounting for scaling teams and controller workflows.", highlights: ["Everything in Starter", "Automation + activity controls", "Advanced reporting + exports"], cta: { label: "Start Growth", href: "/signup?intent=start_workspace", event: "pricing_growth" } },
  { name: "Pro", price: "$129", period: "/month", description: "Multi-entity scale with consolidation, API access, and unlimited limits.", highlights: ["Everything in Growth", "Consolidation workflows", "Unlimited limits + API access"], cta: { label: "Start Pro", href: "/signup?intent=start_workspace", event: "pricing_pro" } },
];
