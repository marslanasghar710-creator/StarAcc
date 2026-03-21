import * as React from "react";

export function ReportSectionHeader({ title, description }: { title: string; description?: string | null }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
