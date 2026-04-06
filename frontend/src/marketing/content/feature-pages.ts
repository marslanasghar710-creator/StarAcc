export const featurePages = {
  "accounting-core": {
    title: "Accounting Core",
    problem: "Teams need ledger discipline, period boundaries, and reliable posting behavior.",
    workflow: "Manage chart of accounts, journals, and close controls with backend-authoritative accounting truth.",
  },
  "invoicing-payables": {
    title: "Invoicing & Payables",
    problem: "Revenue and expense operations break when AR/AP is disconnected from accounting controls.",
    workflow: "Run customer invoicing, bill capture, approvals, and payment workflows mapped into finance records.",
  },
  "banking-reconciliation": {
    title: "Banking & Reconciliation",
    problem: "Cash visibility and reconciliation speed drive accounting confidence.",
    workflow: "Import and classify bank transactions, apply rules, and reconcile with controlled matching flows.",
  },
  "reporting-exports": {
    title: "Reporting & Exports",
    problem: "Operators need dependable reporting outputs for decisions and external stakeholders.",
    workflow: "Use standard financial reports, custom reporting surfaces, and export/PDF outputs.",
  },
  "audit-activity": {
    title: "Audit & Activity",
    problem: "Accounting operations need traceability and role-aware reviewability.",
    workflow: "Review activity events, permissioned actions, and immutable-sensitive operational history.",
  },
  automation: {
    title: "Automation",
    problem: "Manual finance ops slow teams and create inconsistent execution.",
    workflow: "Apply rules, AI extraction, and explainable suggestions with human review in control.",
  },
  consolidation: {
    title: "Consolidation",
    problem: "Multi-entity groups require accurate eliminations and consolidated visibility.",
    workflow: "Configure groups, run consolidation cycles, and review elimination entries in one flow.",
  },
} as const;

export type FeatureSlug = keyof typeof featurePages;
