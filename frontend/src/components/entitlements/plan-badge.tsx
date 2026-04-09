"use client";

import { Badge } from "@/components/ui/badge";

export function PlanBadge({ planId }: { planId?: string | null }) {
  const value = (planId ?? "starter").toUpperCase();
  return <Badge variant="secondary" className="font-medium">{value} Plan</Badge>;
}
