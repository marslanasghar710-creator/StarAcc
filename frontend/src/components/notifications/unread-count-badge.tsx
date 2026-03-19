import { Badge } from "@/components/ui/badge";

export function UnreadCountBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return <Badge className="min-w-5 justify-center rounded-full px-1.5 text-[11px]">{count > 99 ? "99+" : count}</Badge>;
}
