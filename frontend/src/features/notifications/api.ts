import { apiClient } from "@/lib/api/client";
import type { NotificationListResponse, NotificationRecord, UnreadCount } from "@/features/notifications/types";

export async function listNotifications(organizationId: string) {
  return apiClient<NotificationListResponse>(`/organizations/${organizationId}/notifications`);
}

export async function getUnreadNotificationCount(organizationId: string) {
  return apiClient<UnreadCount>(`/organizations/${organizationId}/notifications/unread-count`);
}

export async function markNotificationRead(organizationId: string, notificationId: string) {
  return apiClient<NotificationRecord>(`/organizations/${organizationId}/notifications/${notificationId}/read`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead(organizationId: string) {
  return apiClient<{ updated: number }>(`/organizations/${organizationId}/notifications/read-all`, {
    method: "POST",
  });
}
