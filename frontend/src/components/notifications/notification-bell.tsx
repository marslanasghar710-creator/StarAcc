"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { NotificationListItem } from "@/components/notifications/notification-list-item";
import { UnreadCountBadge } from "@/components/notifications/unread-count-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNotificationsQuery, useUnreadNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from "@/features/notifications/hooks";
import { useOrganization } from "@/providers/organization-provider";
import { usePermissions } from "@/features/permissions/hooks";

export function NotificationBell() {
  const { currentOrganizationId } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("notifications.read");
  const canUpdate = can("notifications.update");
  const { data: unreadData } = useUnreadNotificationsQuery(currentOrganizationId, canRead);
  const { data: notificationsData } = useNotificationsQuery(currentOrganizationId, canRead);
  const markReadMutation = useMarkNotificationReadMutation(currentOrganizationId);
  const markAllMutation = useMarkAllNotificationsReadMutation(currentOrganizationId);

  const unreadCount = unreadData?.unread_count ?? 0;
  const previewItems = notificationsData?.items.slice(0, 4) ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Notifications" className="relative rounded-xl">
          <Bell className="size-4" />
          <span className="absolute -right-1.5 -top-1.5">
            <UnreadCountBadge count={unreadCount} />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {canUpdate ? (
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => markAllMutation.mutate()}>
              <CheckCheck className="size-4" />
              Mark all read
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[420px] overflow-y-auto p-3">
          {!canRead ? (
            <EmptyState title="Notifications unavailable" description="Your role does not include permission to read notifications in this organization." />
          ) : previewItems.length ? (
            <div className="space-y-3">
              {previewItems.map((notification) => (
                <NotificationListItem key={notification.id} notification={notification} onMarkRead={(notificationId) => markReadMutation.mutate(notificationId)} canMarkRead={canUpdate} />
              ))}
            </div>
          ) : (
            <EmptyState title="No notifications yet" description="New alerts for invoices, payments, reports, and operational events will appear here." />
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="px-4 py-3">
          <Button asChild className="w-full" variant="outline">
            <Link href="/notifications">Open notifications center</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
