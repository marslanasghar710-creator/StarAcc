import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EntitySummaryCard({
  title,
  description,
  rows,
  footer,
}: {
  title: string;
  description?: string;
  rows: Array<{ label: string; value: ReactNode }>;
  footer?: ReactNode;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
        {footer}
      </CardContent>
    </Card>
  );
}
