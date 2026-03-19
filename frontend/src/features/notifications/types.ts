export type NotificationRecord = {
  id: string;
  organization_id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
};

export type NotificationListResponse = {
  items: NotificationRecord[];
};

export type UnreadCount = {
  unread_count: number;
};
