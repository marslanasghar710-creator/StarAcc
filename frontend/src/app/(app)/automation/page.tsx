"use client";

import * as React from "react";
import Link from "next/link";
import { BrainCircuit, Plus, Sparkles, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AutomationRuleFormDialog } from "@/features/automation/components/automation-rule-form-dialog";
import { AutomationRuleTestDialog } from "@/features/automation/components/automation-rule-test-dialog";
import { AutomationRulesTable } from "@/features/automation/components/automation-rules-table";
import { StructuredDataViewer } from "@/features/automation/components/structured-data-viewer";
import { useArchiveAutomationRule, useAutomationRules, useCreateAutomationRule, useTestAutomationRule, useUpdateAutomationRule } from "@/features/automation/hooks";
import { type AutomationRuleFormValues, type AutomationRuleTestValues } from "@/features/automation/schemas";
import type { AutomationRule } from "@/features/automation/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function parseJson(input: string, fallback: unknown) {
  return input.trim() ? JSON.parse(input) : fallback;
}

function toRulePayload(values: AutomationRuleFormValues) {
  return {
    name: values.name.trim(),
    rule_type: values.rule_type.trim(),
    priority: Number(values.priority),
    is_active: values.is_active,
    description: values.description || null,
    entity_type: values.entity_type || null,
    trigger_event: values.trigger_event || null,
    action_type: values.action_type || null,
    conditions: parseJson(values.conditions_json, []),
    action_config: parseJson(values.action_config_json || "", null),
  };
}

export default function AutomationPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can, hasAnyPermission } = usePermissions();
  const canAccessAutomation = hasAnyPermission(["automation_rules.read", "suggestions.read", "document_intelligence.read", "ai_jobs.read"]);
  const canReadRules = can("automation_rules.read");
  const canCreateRules = can("automation_rules.create");
  const canUpdateRules = can("automation_rules.update");
  const canArchiveRules = can("automation_rules.archive");
  const [search, setSearch] = React.useState("");
  const [isRuleDialogOpen, setIsRuleDialogOpen] = React.useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = React.useState(false);
  const [selectedRule, setSelectedRule] = React.useState<AutomationRule | null>(null);

  const rulesQuery = useAutomationRules(currentOrganizationId ?? undefined, canReadRules);
  const createRuleMutation = useCreateAutomationRule(currentOrganizationId ?? undefined);
  const updateRuleMutation = useUpdateAutomationRule(currentOrganizationId ?? undefined, selectedRule?.id);
  const archiveRuleMutation = useArchiveAutomationRule(currentOrganizationId ?? undefined);
  const testRuleMutation = useTestAutomationRule(currentOrganizationId ?? undefined, selectedRule?.id);

  const filteredRules = React.useMemo(() => {
    const rows = rulesQuery.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((rule) => [rule.name, rule.ruleType, rule.entityType, rule.actionType].some((value) => value?.toLowerCase().includes(term)));
  }, [rulesQuery.data, search]);

  async function handleCreate(values: AutomationRuleFormValues) {
    const created = await createRuleMutation.mutateAsync(toRulePayload(values));
    toast.success(`Created automation rule ${created.name}`);
  }

  async function handleUpdate(values: AutomationRuleFormValues) {
    const updated = await updateRuleMutation.mutateAsync(toRulePayload(values));
    toast.success(`Updated automation rule ${updated.name}`);
  }

  async function handleArchive(rule: AutomationRule) {
    if (typeof window !== "undefined" && !window.confirm(`Archive ${rule.name}? This stops new suggestion generation but keeps historical explainability.`)) {
      return;
    }
    await archiveRuleMutation.mutateAsync(rule.id);
    toast.success(`Archived ${rule.name}`);
  }

  async function handleTest(values: AutomationRuleTestValues) {
    await testRuleMutation.mutateAsync({ sample_payload: JSON.parse(values.sample_payload_json) });
  }

  function openCreate() {
    setSelectedRule(null);
    setIsRuleDialogOpen(true);
  }

  function openEdit(rule: AutomationRule) {
    setSelectedRule(rule);
    setIsRuleDialogOpen(true);
  }

  function openTest(rule: AutomationRule) {
    setSelectedRule(rule);
    testRuleMutation.reset();
    setIsTestDialogOpen(true);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading automation workspace" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening automation." />;
  }

  if (!canAccessAutomation) {
    return <AccessDeniedState description="You need automation, suggestion, document intelligence, or AI jobs permissions to access this workspace." />;
  }

  const rules = rulesQuery.data ?? [];
  const activeRules = rules.filter((rule) => rule.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Automation"}
        title="Automation"
        description="Manage assistive automation rules with explicit explainability, human review, and backend-owned financial truth."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/automation/suggestions"><Sparkles className="size-4" />Suggestions</Link></Button>
            <Button asChild variant="outline"><Link href="/automation/documents"><WandSparkles className="size-4" />Documents</Link></Button>
            <Button asChild variant="outline"><Link href="/automation/jobs"><BrainCircuit className="size-4" />AI jobs</Link></Button>
            {canCreateRules ? <Button onClick={openCreate}><Plus className="size-4" />New rule</Button> : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Total rules</CardTitle><CardDescription>Automation rules loaded from the backend.</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{rules.length}</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Active rules</CardTitle><CardDescription>Currently able to produce assistive suggestions.</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{activeRules.length}</p></CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Explainability posture</CardTitle><CardDescription>Rules should always remain inspectable and human reviewed.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Every rule is designed to surface a reason trace, not replace accounting controls.</CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle>Rule permissions</CardTitle><CardDescription>Current workspace capabilities.</CardDescription></CardHeader><CardContent className="space-y-1 text-sm"><p>Read: {canReadRules ? "Allowed" : "Restricted"}</p><p>Create: {canCreateRules ? "Allowed" : "Restricted"}</p><p>Update: {canUpdateRules ? "Allowed" : "Restricted"}</p><p>Archive: {canArchiveRules ? "Allowed" : "Restricted"}</p></CardContent></Card>
      </div>

      {!canReadRules ? <AccessDeniedState title="Automation rules restricted" description="Your role can access the automation workspace, but it cannot read automation rules." /> : (
        <>
          <PageActionBar left={<Input className="max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rules by name, type, entity, or action" />} right={<p className="text-sm text-muted-foreground">Rule testing calls the backend test endpoint and shows returned traces and metadata only.</p>} />
          {rulesQuery.isLoading ? <LoadingScreen label="Loading automation rules" /> : null}
          {rulesQuery.isError ? <ErrorState description="We couldn't load automation rules." onRetry={() => void rulesQuery.refetch()} /> : null}
          {!rulesQuery.isLoading && !rulesQuery.isError && filteredRules.length === 0 ? <EmptyState title={search ? "No matching automation rules" : "No automation rules yet"} description={search ? "Try a broader search term." : "Create the first explainable automation rule for this organization."} action={canCreateRules ? <Button onClick={openCreate}><Plus className="size-4" />Create rule</Button> : undefined} /> : null}
          {!rulesQuery.isLoading && !rulesQuery.isError && filteredRules.length > 0 ? <AutomationRulesTable rules={filteredRules} onEdit={canUpdateRules ? openEdit : undefined} onTest={canReadRules ? openTest : undefined} onArchive={canArchiveRules ? handleArchive : undefined} /> : null}
        </>
      )}

      {selectedRule ? (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Selected rule explainability context</CardTitle>
            <CardDescription>Understand what the rule can inspect and suggest before enabling it operationally.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div><p className="text-sm text-muted-foreground">Description</p><p className="mt-1 text-sm">{selectedRule.description || "No description provided."}</p></div>
              <div><p className="text-sm text-muted-foreground">Action config</p><StructuredDataViewer data={selectedRule.actionConfig} className="mt-2" /></div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conditions</p>
              <StructuredDataViewer data={{ conditions: selectedRule.conditions }} className="mt-2" emptyLabel="No conditions defined." />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <AutomationRuleFormDialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen} rule={selectedRule} onSubmit={selectedRule ? handleUpdate : handleCreate} isSubmitting={selectedRule ? updateRuleMutation.isPending : createRuleMutation.isPending} />
      <AutomationRuleTestDialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen} rule={selectedRule} onSubmit={handleTest} isSubmitting={testRuleMutation.isPending} result={testRuleMutation.data ?? null} />
    </div>
  );
}
