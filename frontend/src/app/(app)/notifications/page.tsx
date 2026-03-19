"use client";

import { CheckCheck } from "lucide-react";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { ErrorState } from "@/components/feedback/error-state";
import { NotificationList } from "@/components/notifications/notification-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation, useNotificationsQuery, useUnreadNotificationsQuery } from "@/features/notifications/hooks";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

export default function NotificationsPage() {
  const { currentOrganization, currentOrganizationId } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("notifications.read");
  const canUpdate = can("notifications.update");
  const notificationsQuery = useNotificationsQuery(currentOrganizationId, canRead);
  const unreadQuery = useUnreadNotificationsQuery(currentOrganizationId, canRead);
  const markReadMutation = useMarkNotificationReadMutation(currentOrganizationId);
  const markAllMutation = useMarkAllNotificationsReadMutation(currentOrganizationId);

  if (!canRead) {
    return <AccessDeniedState description="Your role does not include notifications.read for this organization." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Notifications center"
        description={`Monitor organization-scoped alerts for ${currentOrganization?.name ?? "your active workspace"}, then mark individual items or the full inbox as read.`}
        actions={canUpdate ? (
          <Button variant="outline" className="gap-2" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending || (unreadQuery.data?.unread_count ?? 0) === 0}>
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        ) : undefined}
      />

      <div className="rounded-2xl border border-border/70 bg-background p-4 text-sm text-muted-foreground shadow-sm">
        Unread notifications: <span className="font-semibold text-foreground">{unreadQuery.data?.unread_count ?? 0}</span>
      </div>

      {notificationsQuery.isError ? (
        <ErrorState description="We couldn't load the notification feed for the selected organization." onRetry={() => void notificationsQuery.refetch()} />
      ) : (
        <NotificationList items={notificationsQuery.data?.items ?? []} onMarkRead={(notificationId) => markReadMutation.mutate(notificationId)} canMarkRead={canUpdate} />
      )}
    </div>
  );
}
