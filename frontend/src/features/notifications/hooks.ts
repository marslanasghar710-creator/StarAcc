"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { getUnreadNotificationCount, listNotifications, markAllNotificationsRead, markNotificationRead } from "@/features/notifications/api";

export function useNotificationsQuery(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.notifications.list(organizationId) : ["notifications", "missing", "list"],
    queryFn: () => listNotifications(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useUnreadNotificationsQuery(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.notifications.unreadCount(organizationId) : ["notifications", "missing", "unread-count"],
    queryFn: () => getUnreadNotificationCount(organizationId as string),
    enabled: enabled && Boolean(organizationId),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationReadMutation(organizationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(organizationId as string, notificationId),
    onSuccess: async () => {
      if (!organizationId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(organizationId) }),
      ]);
    },
  });
}

export function useMarkAllNotificationsReadMutation(organizationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(organizationId as string),
    onSuccess: async () => {
      if (!organizationId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(organizationId) }),
      ]);
    },
  });
}
