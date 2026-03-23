import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  active: "border-emerald-500/40 text-emerald-700",
  inactive: "border-slate-400/40 text-slate-600",
  archived: "border-rose-500/40 text-rose-700",
  pending: "border-amber-500/40 text-amber-700",
  accepted: "border-emerald-500/40 text-emerald-700",
  rejected: "border-rose-500/40 text-rose-700",
  queued: "border-sky-500/40 text-sky-700",
  running: "border-indigo-500/40 text-indigo-700",
  completed: "border-emerald-500/40 text-emerald-700",
  failed: "border-rose-500/40 text-rose-700",
  review_required: "border-amber-500/40 text-amber-700",
};

export function AutomationStatusBadge({ value }: { value?: string | null }) {
  const key = value || "pending";
  return (
    <Badge variant="outline" className={cn("capitalize", toneMap[key] ?? "border-primary/30 text-primary")}>
      {key.replaceAll("_", " ")}
    </Badge>
  );
}
