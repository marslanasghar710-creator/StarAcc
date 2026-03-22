import * as React from "react";

import Link from "next/link";
import { LockKeyhole, Star } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReportsLandingItem } from "@/features/reporting/types";

export function ReportsNav({
  reports,
  activeHref,
  compact = false,
}: {
  reports: Array<ReportsLandingItem & { isPermitted?: boolean }>;
  activeHref?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {reports.map((report) => {
          const isActive = activeHref === report.href;
          const isPermitted = report.isPermitted ?? true;

          return (
            <Link
              key={report.id}
              href={isPermitted ? report.href : "#"}
              aria-disabled={!isPermitted}
              className={cn(
                "rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm transition hover:border-primary/40",
                isActive ? "border-primary bg-primary/5" : undefined,
                !isPermitted ? "pointer-events-none opacity-65" : undefined,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{report.name}</span>
                {report.recommended ? <Star className="size-4 text-amber-500" /> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{report.description}</p>
              {!isPermitted ? <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><LockKeyhole className="size-3" />Restricted</p> : null}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {reports.map((report) => {
        const isPermitted = report.isPermitted ?? true;

        return (
          <Card key={report.id} className={cn(!isPermitted ? "opacity-70" : undefined)}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{report.name}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
                {report.recommended ? <Star className="size-4 text-amber-500" /> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {report.allowedFormats.map((format) => (
                  <span key={format} className="rounded-full border border-border/70 px-2 py-0.5 uppercase">
                    {format}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{isPermitted ? "Available in your role" : "Restricted for your role"}</span>
                {isPermitted ? (
                  <Link href={report.href} className="font-medium text-primary hover:underline">
                    Open report
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><LockKeyhole className="size-3.5" />No access</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
