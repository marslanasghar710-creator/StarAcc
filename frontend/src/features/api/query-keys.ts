export const queryKeys = {
  auth: {
    currentUser: ["auth", "current-user"] as const,
  },
  organizations: {
    list: ["organizations", "list"] as const,
  },
  notifications: {
    list: ["notifications", "list"] as const,
    unreadCount: ["notifications", "unread-count"] as const,
  },
};
