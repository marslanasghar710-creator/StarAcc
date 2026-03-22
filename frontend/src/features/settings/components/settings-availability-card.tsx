import Link from "next/link";
import { CheckCircle2, CircleOff, LockKeyhole, PencilRuler } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SettingsSectionStatus } from "@/features/settings/types";

function tone(status: SettingsSectionStatus["availability"]) {
  switch (status) {
    case "available":
      return { label: "Live", icon: CheckCircle2, variant: "success" as const };
    case "read-only":
      return { label: "Read only", icon: PencilRuler, variant: "warning" as const };
    default:
      return { label: "Unavailable", icon: CircleOff, variant: "secondary" as const };
  }
}

export function SettingsAvailabilityCard({ section, isPermitted }: { section: SettingsSectionStatus; isPermitted: boolean }) {
  const status = tone(section.availability);
  const Icon = status.icon;

  return (
    <Card className={!isPermitted ? "opacity-70" : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </div>
          <Badge variant={status.variant}>
            <Icon className="mr-1 size-3.5" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{!isPermitted ? "Restricted by permissions for the active organization." : section.reason || "Available for the active organization."}</p>
        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{isPermitted ? "Section access" : "Permission state"}</span>
          {isPermitted && section.availability !== "unavailable" ? (
            <Link href={section.href} className="font-medium text-primary hover:underline">
              Open section
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <LockKeyhole className="size-3.5" />
              No access
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
