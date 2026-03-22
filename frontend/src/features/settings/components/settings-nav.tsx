import * as React from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";
import type { SettingsSectionStatus } from "@/features/settings/types";

export function SettingsNav({ sections, activeHref }: { sections: Array<SettingsSectionStatus & { isPermitted?: boolean }>; activeHref: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {sections.map((section) => {
        const active = activeHref === section.href;
        const enabled = section.isPermitted ?? true;

        return (
          <Link
            key={section.id}
            href={enabled ? section.href : "#"}
            aria-disabled={!enabled}
            className={cn(
              "rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm transition",
              active ? "border-primary bg-primary/5" : undefined,
              !enabled ? "pointer-events-none opacity-60" : "hover:border-primary/40",
            )}
          >
            <div className="font-medium">{section.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{section.description}</div>
            <div className="mt-2 text-xs text-muted-foreground">{enabled ? section.reason || section.availability : "Permission restricted"}</div>
          </Link>
        );
      })}
    </div>
  );
}
