"use client";

import Link from "next/link";
import { ArrowRight, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelativeTime } from "@/lib/formatters";
import type { NotificationRecord } from "@/features/notifications/types";

function getNotificationHref(notification: NotificationRecord) {
  if (!notification.entity_type || !notification.entity_id) {
    return null;
  }

  const entityMap: Record<string, string> = {
    invoice: "/invoices",
    bill: "/bills",
    report: "/reports",
    bank_transaction: "/banking",
  };

  return entityMap[notification.entity_type] ?? "/notifications";
}

export function NotificationListItem({ notification, onMarkRead, canMarkRead }: { notification: NotificationRecord; onMarkRead?: (notificationId: string) => void; canMarkRead?: boolean; }) {
  const href = getNotificationHref(notification);

  return (
    <div className={cn("rounded-2xl border border-border/70 p-4 transition-colors", notification.is_read ? "bg-background" : "bg-primary/5")}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-1 size-2.5 rounded-full", notification.is_read ? "bg-border" : "bg-primary")} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-foreground">{notification.title}</p>
            <time className="text-xs text-muted-foreground" title={formatDateTime(notification.created_at)}>{formatRelativeTime(notification.created_at)}</time>
          </div>
          <p className="text-sm text-muted-foreground">{notification.message}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {href ? (
          <Button asChild variant="ghost" size="sm" className="gap-2 px-0 text-primary hover:bg-transparent">
            <Link href={href}>
              Open related area
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : <span />}
        {!notification.is_read && canMarkRead ? (
          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => onMarkRead?.(notification.id)}>
            <CheckCheck className="size-4" />
            Mark read
          </Button>
        ) : null}
      </div>
    </div>
  );
}
