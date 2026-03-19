import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ErrorState({ title = "Something went wrong", description = "We couldn't load this section right now.", action, onRetry }: { title?: string; description?: string; action?: ReactNode; onRetry?: () => void; }) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
      <div className="flex items-start gap-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          {action ?? (onRetry ? <Button className="mt-4" variant="outline" onClick={onRetry}>Try again</Button> : null)}
        </div>
      </div>
    </div>
  );
}
