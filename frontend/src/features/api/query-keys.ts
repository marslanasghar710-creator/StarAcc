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
};
