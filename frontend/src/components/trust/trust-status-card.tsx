"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrustDomainStatus } from "@/features/trust/types";

const STATUS_CLASS: Record<string, string> = {
  healthy: "text-emerald-600",
  attention_needed: "text-amber-600",
  degraded: "text-red-600",
  unknown: "text-muted-foreground",
};

export function TrustStatusCard({ domain }: { domain: TrustDomainStatus }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{domain.label}</span>
          <span className={`text-xs font-medium ${STATUS_CLASS[domain.status] ?? STATUS_CLASS.unknown}`}>{domain.status.replaceAll("_", " ")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{domain.description}</p>
      </CardContent>
    </Card>
  );
}
