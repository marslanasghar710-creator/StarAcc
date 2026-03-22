import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  draft: "border-slate-400/40 text-slate-600",
  active: "border-emerald-500/40 text-emerald-700",
  disposed: "border-rose-500/40 text-rose-700",
  fully_depreciated: "border-amber-500/40 text-amber-700",
  archived: "border-slate-400/40 text-slate-600",
  scheduled: "border-sky-500/40 text-sky-700",
  posted: "border-emerald-500/40 text-emerald-700",
  reversed: "border-rose-500/40 text-rose-700",
  completed: "border-emerald-500/40 text-emerald-700",
  failed: "border-rose-500/40 text-rose-700",
};

export function AssetStatusBadge({ value }: { value: string }) {
  const key = String(value);
  return (
    <Badge variant="outline" className={cn("capitalize", toneMap[key] ?? "border-primary/30 text-primary")}>
      {key.replaceAll("_", " ")}
    </Badge>
  );
}
