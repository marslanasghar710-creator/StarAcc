"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/features/funnel/analytics";
import { useOnboardingMutations } from "@/features/onboarding/hooks";
import type { OnboardingStatus } from "@/features/onboarding/types";

type Props = {
  organizationId: string;
  status: OnboardingStatus;
};

export function OnboardingHub({ organizationId, status }: Props) {
  const { taskMutation } = useOnboardingMutations(organizationId);
  const toActivationItemId = (taskKey: string) => ({
    "set-company-details": "settings_reviewed",
    "confirm-fiscal-year": "settings_reviewed",
    "setup-chart-of-accounts": "chart_of_accounts_ready",
    "add-bank-account": "bank_account_added",
    "add-first-counterparty": "customer_added",
    "create-first-transaction": "first_invoice_created",
  }[taskKey] ?? taskKey);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Setup progress: {status.progress_percent}%</CardTitle>
          <CardDescription>
            Completion tier {status.completion_tier}. {status.is_demo_org ? "Demo context active." : "Real company setup context."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {status.tasks.map((task) => (
            <div key={task.key} className={cn("rounded-lg border p-3", task.required ? "border-primary/40" : "border-border") }>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{task.title}</p>
                <span className="text-xs text-muted-foreground uppercase">{task.status}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
              <div className="mt-3 flex gap-2">
                {task.route ? <Button asChild size="sm" variant="secondary"><Link href={task.route}>Open</Link></Button> : null}
                <Button
                  size="sm"
                  onClick={() => taskMutation.mutate(
                    { taskKey: task.key, status: "completed" },
                    {
                      onSuccess: () => {
                        void trackEvent("activation.checklist_item.completed", { checklist_version: "v1", item_id: toActivationItemId(task.key), completion_source: "user_action" }, { page_type: "activation", surface: "activation", funnel_domain: "activation", funnel_stage: "activation_started", org_id: organizationId, is_authenticated: true });
                      },
                    },
                  )}
                  disabled={task.blocked || task.status === "completed"}
                >
                  Mark done
                </Button>
                <Button size="sm" variant="ghost" onClick={() => taskMutation.mutate({ taskKey: task.key, status: "skipped" })} disabled={task.status !== "pending"}>Skip</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
