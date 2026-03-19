export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
    sessions: ["auth", "sessions"] as const,
    roles: ["auth", "roles"] as const,
    permissions: ["auth", "permissions"] as const,
  },
  organizations: {
    list: ["organizations", "list"] as const,
    detail: (organizationId: string) => ["organizations", organizationId] as const,
    settings: (organizationId: string) => ["organizations", organizationId, "settings"] as const,
    members: (organizationId: string) => ["organizations", organizationId, "members"] as const,
  },
  notifications: {
    list: (organizationId: string) => ["notifications", organizationId, "list"] as const,
    unreadCount: (organizationId: string) => ["notifications", organizationId, "unread-count"] as const,
  },
  accounts: {
    root: (organizationId: string) => ["accounts", organizationId] as const,
    list: (organizationId: string, search = "") => ["accounts", organizationId, "list", search] as const,
    detail: (organizationId: string, accountId: string) => ["accounts", organizationId, "detail", accountId] as const,
    balance: (organizationId: string, accountId: string) => ["accounts", organizationId, "balance", accountId] as const,
    ledger: (organizationId: string, accountId: string) => ["accounts", organizationId, "ledger", accountId] as const,
  },
  journals: {
    root: (organizationId: string) => ["journals", organizationId] as const,
    list: (organizationId: string, search = "") => ["journals", organizationId, "list", search] as const,
    detail: (organizationId: string, journalId: string) => ["journals", organizationId, "detail", journalId] as const,
  },
  periods: {
    root: (organizationId: string) => ["periods", organizationId] as const,
    list: (organizationId: string) => ["periods", organizationId, "list"] as const,
    detail: (organizationId: string, periodId: string) => ["periods", organizationId, "detail", periodId] as const,
  },
};
