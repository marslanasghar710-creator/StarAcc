"use client";

import { EmptyState } from "@/components/feedback/empty-state";
import { NotificationListItem } from "@/components/notifications/notification-list-item";
import type { NotificationRecord } from "@/features/notifications/types";

export function NotificationList({ items, onMarkRead, canMarkRead = false, emptyTitle = "All caught up", emptyDescription = "New workflow and system alerts will appear here for the active organization." }: { items: NotificationRecord[]; onMarkRead?: (notificationId: string) => void; canMarkRead?: boolean; emptyTitle?: string; emptyDescription?: string; }) {
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {items.map((notification) => (
        <NotificationListItem key={notification.id} notification={notification} onMarkRead={onMarkRead} canMarkRead={canMarkRead} />
      ))}
    </div>
  );
}
