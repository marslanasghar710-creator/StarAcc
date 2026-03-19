import { Badge } from "@/components/ui/badge";

const variantMap = {
  healthy: "success",
  warning: "warning",
  blocked: "danger",
  draft: "secondary",
} as const;

export function StatusBadge({ status }: { status: keyof typeof variantMap }) {
  return <Badge variant={variantMap[status]}>{status}</Badge>;
}
