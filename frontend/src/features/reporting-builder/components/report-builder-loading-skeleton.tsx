import { Skeleton } from "@/components/ui/skeleton";

export function ReportBuilderLoadingSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
      <Skeleton className="h-[540px] w-full rounded-xl" />
    </div>
  );
}
