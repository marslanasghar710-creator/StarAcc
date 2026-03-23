import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  active: "border-emerald-500/40 text-emerald-700",
  inactive: "border-slate-400/40 text-slate-600",
  terminated: "border-rose-500/40 text-rose-700",
  on_leave: "border-amber-500/40 text-amber-700",
  full_time: "border-sky-500/40 text-sky-700",
  part_time: "border-indigo-500/40 text-indigo-700",
  contractor: "border-fuchsia-500/40 text-fuchsia-700",
  casual: "border-orange-500/40 text-orange-700",
  draft: "border-slate-400/40 text-slate-600",
  open: "border-sky-500/40 text-sky-700",
  calculated: "border-amber-500/40 text-amber-700",
  posted: "border-emerald-500/40 text-emerald-700",
  processing: "border-indigo-500/40 text-indigo-700",
  closed: "border-slate-500/40 text-slate-700",
  failed: "border-rose-500/40 text-rose-700",
};

export function PayrollStatusBadge({ value }: { value?: string | null }) {
  const key = value || "draft";
  return (
    <Badge variant="outline" className={cn("capitalize", toneMap[key] ?? "border-primary/30 text-primary")}>
      {key.replaceAll("_", " ")}
    </Badge>
  );
}
