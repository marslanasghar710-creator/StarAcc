"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2 } from "lucide-react";

import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trackFunnelEvent } from "@/features/funnel/analytics";
import { useCreateOrganizationMutation } from "@/features/organizations/hooks";
import { useOnboardingStatus } from "@/features/onboarding/hooks";
import { useOrganization } from "@/providers/organization-provider";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD"];
const TIMEZONES = ["America/New_York", "America/Chicago", "America/Los_Angeles", "UTC"];

export default function ConversionStartPage() {
  const router = useRouter();
  const { organizations, currentOrganizationId, setCurrentOrganizationId, isLoadingOrganizations } = useOrganization();
  const createOrgMutation = useCreateOrganizationMutation();

  const hasOrganizations = organizations.length > 0;
  const activeOrganizationId = currentOrganizationId ?? organizations[0]?.id;
  const onboardingQuery = useOnboardingStatus(activeOrganizationId, Boolean(activeOrganizationId));

  const [form, setForm] = React.useState({ name: "", legal_name: "", base_currency: "USD", timezone: "America/New_York" });

  React.useEffect(() => {
    void trackFunnelEvent("activation_entered", { screen: "conversion_start" });
  }, []);

  const createWorkspace = async () => {
    void trackFunnelEvent("workspace_creation_started", { source: "start_page" });
    const org = await createOrgMutation.mutateAsync({
      name: form.name,
      legal_name: form.legal_name || undefined,
      base_currency: form.base_currency,
      timezone: form.timezone,
      fiscal_year_start_month: 1,
      fiscal_year_start_day: 1,
    });
    setCurrentOrganizationId(org.id);
    void trackFunnelEvent("workspace_created", { organization_id: org.id, source: "start_page" });
    router.replace("/setup?from=workspace_created");
  };

  if (isLoadingOrganizations) return <LoadingScreen label="Preparing your workspace" />;

  if (!hasOrganizations) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Activation" title="Create your workspace" description="Set up a real organization in under a minute, then continue with guided activation." />
        <Card className="max-w-2xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2"><Building2 className="size-4" /> Workspace basics</CardTitle>
            <CardDescription>Minimal setup now. You can refine fiscal and accounting details in Setup Center.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="org-name">Organization name</Label>
              <Input id="org-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Northwind Retail LLC" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="legal-name">Legal name (optional)</Label>
              <Input id="legal-name" value={form.legal_name} onChange={(event) => setForm((current) => ({ ...current, legal_name: event.target.value }))} placeholder="Northwind Retail Holdings LLC" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Base currency</Label>
                <Select value={form.base_currency} onValueChange={(value) => setForm((current) => ({ ...current, base_currency: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Timezone</Label>
                <Select value={form.timezone} onValueChange={(value) => setForm((current) => ({ ...current, timezone: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map((timezone) => <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => void createWorkspace()} disabled={!form.name || createOrgMutation.isPending}>
              {createOrgMutation.isPending ? "Creating workspace..." : "Create workspace and continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onboarding = onboardingQuery.data;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Activation" title="Activate your workspace" description="Continue setup with a deterministic checklist tied to real backend state." actions={<Button onClick={() => router.push("/setup")}>Open Setup Center</Button>} />
      <Card className="border-border/70 shadow-sm max-w-3xl">
        <CardHeader>
          <CardTitle>Activation checklist</CardTitle>
          <CardDescription>{onboarding ? `${onboarding.progress_percent}% complete` : "Load progress"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(onboarding?.tasks ?? []).slice(0, 6).map((task) => (
            <div key={task.key} className="flex items-start justify-between rounded-xl border border-border/70 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.description}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className={`size-3.5 ${task.status === "completed" ? "text-emerald-500" : "text-muted-foreground"}`} />
                {task.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
