import { Loader2 } from "lucide-react";

export function LoadingScreen({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Loader2 className="size-6 animate-spin" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">Preparing your organization context, permissions, and notifications.</p>
      </div>
    </div>
  );
}
