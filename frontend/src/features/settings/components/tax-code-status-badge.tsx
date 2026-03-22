import { Badge } from "@/components/ui/badge";

export function TaxCodeStatusBadge({ isActive }: { isActive: boolean }) {
  return <Badge variant={isActive ? "success" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>;
}
