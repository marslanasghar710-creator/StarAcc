import * as React from "react";

import { Badge } from "@/components/ui/badge";

export function ReportStatusIndicator({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const variant = tone === "default" ? "outline" : tone;
  return <Badge variant={variant}>{label}</Badge>;
}
