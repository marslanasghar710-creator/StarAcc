"use client";

import type { ReactNode } from "react";

import { UpgradeCTA } from "@/components/entitlements/upgrade-cta";
import { Card, CardContent } from "@/components/ui/card";
import { useBillingState } from "@/features/billing/hooks";
import { useOrganization } from "@/providers/organization-provider";

export function FeatureGate({ feature, children }: { feature: string; children: ReactNode }) {
  const { currentOrganizationId } = useOrganization();
  const billing = useBillingState(currentOrganizationId ?? undefined);

  if (!currentOrganizationId || billing.isLoading) return <>{children}</>;
  const allowed = billing.data?.features?.[feature] ?? false;
  if (allowed) return <>{children}</>;

  return (
    <Card className="border-border/70">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium">Feature locked</p>
          <p className="text-xs text-muted-foreground">Available on a higher plan tier.</p>
        </div>
        <UpgradeCTA />
      </CardContent>
    </Card>
  );
}
