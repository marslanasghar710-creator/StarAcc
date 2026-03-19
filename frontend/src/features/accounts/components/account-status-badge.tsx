import { Badge } from "@/components/ui/badge";

export function AccountStatusBadge({ kind, value }: { kind: "active" | "postable" | "system" | "type"; value: boolean | string }) {
  if (kind === "type") {
    return <Badge variant="secondary" className="capitalize">{String(value)}</Badge>;
  }

  if (kind === "active") {
    return <Badge variant={value ? "success" : "secondary"}>{value ? "Active" : "Inactive"}</Badge>;
  }

  if (kind === "postable") {
    return <Badge variant={value ? "outline" : "warning"}>{value ? "Postable" : "Header only"}</Badge>;
  }

  return <Badge variant={value ? "warning" : "secondary"}>{value ? "System" : "Custom"}</Badge>;
}
