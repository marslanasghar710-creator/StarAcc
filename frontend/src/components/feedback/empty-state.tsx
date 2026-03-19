import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyState({ title, description, action, actionLabel }: { title: string; description: string; action?: ReactNode; actionLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-5" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ?? (actionLabel ? <Button className="mt-5" variant="outline">{actionLabel}</Button> : null)}
    </div>
  );
}
