import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const movementToneMap: Record<string, string> = {
  opening: "bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
  purchase: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  sale: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  adjustment_in: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300",
  adjustment_out: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300",
  reversal: "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
};

export function InventoryStatusBadge({ kind, value }: { kind: "active" | "tracked" | "movement" | "adjustment"; value: boolean | string }) {
  if (kind === "active") {
    return <Badge variant="outline" className={cn(value ? "border-emerald-500/40 text-emerald-700" : "border-slate-400/40 text-slate-600")}>{value ? "Active" : "Inactive"}</Badge>;
  }

  if (kind === "tracked") {
    return <Badge variant="outline" className={cn(value ? "border-primary/30 text-primary" : "border-slate-400/40 text-slate-600")}>{value ? "Tracked" : "Non-tracked"}</Badge>;
  }

  if (kind === "adjustment") {
    const label = String(value).replaceAll("_", " ");
    return <Badge variant="secondary" className="capitalize">{label}</Badge>;
  }

  const label = String(value).replaceAll("_", " ");
  return <Badge variant="outline" className={cn("capitalize", movementToneMap[String(value)] ?? "border-slate-400/40 text-slate-600")}>{label}</Badge>;
}
