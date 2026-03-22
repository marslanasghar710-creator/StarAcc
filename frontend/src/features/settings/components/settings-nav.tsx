import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SettingsSectionStatus } from "@/features/settings/types";

function availabilityVariant(availability: SettingsSectionStatus["availability"]) {
  switch (availability) {
    case "available":
      return { label: "Live", variant: "success" as const };
    case "read-only":
      return { label: "Read only", variant: "warning" as const };
    default:
      return { label: "Unavailable", variant: "secondary" as const };
  }
}

export function SettingsNav({ sections, activeHref }: { sections: Array<SettingsSectionStatus & { isPermitted?: boolean }>; activeHref: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {sections.map((section) => {
        const active = activeHref === section.href;
        const enabled = section.isPermitted ?? true;
        const availability = availabilityVariant(section.availability);

        return (
          <Link
            key={section.id}
            href={enabled ? section.href : "#"}
            aria-disabled={!enabled}
            className={cn(
              "rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm transition",
              active ? "border-primary bg-primary/5" : undefined,
              !enabled ? "pointer-events-none opacity-60" : "hover:border-primary/40 hover:bg-accent/20",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{section.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{section.description}</div>
              </div>
              <Badge variant={enabled ? availability.variant : "secondary"}>{enabled ? availability.label : "Restricted"}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{enabled ? section.reason || section.availability : "Permission restricted for your current role."}</span>
              {enabled ? <ArrowRight className="size-3.5 shrink-0" /> : <LockKeyhole className="size-3.5 shrink-0" />}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
