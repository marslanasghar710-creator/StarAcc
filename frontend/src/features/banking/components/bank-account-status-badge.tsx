import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";

export function BankAccountStatusBadge({ isActive }: { isActive: boolean }) {
  const variant: BadgeProps["variant"] = isActive ? "success" : "secondary";
  return <Badge variant={variant}>{isActive ? "Active" : "Inactive"}</Badge>;
}
