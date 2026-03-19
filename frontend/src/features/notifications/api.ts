import { apiClient } from "@/lib/api/client";

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type UnreadCount = {
  unread_count: number;
};

export async function listNotifications(organizationId: string) {
  return apiClient<{ items: NotificationRecord[] }>(`/organizations/${organizationId}/notifications`);
}

export async function getUnreadNotificationCount(organizationId: string) {
  return apiClient<UnreadCount>(`/organizations/${organizationId}/notifications/unread-count`);
}
