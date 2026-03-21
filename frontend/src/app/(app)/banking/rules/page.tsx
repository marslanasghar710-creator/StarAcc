"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/features/accounts/hooks";
import { BankRuleFormDialog } from "@/features/banking/components/bank-rule-form-dialog";
import { BankRuleListTable } from "@/features/banking/components/bank-rule-list-table";
import { BankRuleTestDialog } from "@/features/banking/components/bank-rule-test-dialog";
import { useArchiveBankRule, useBankRules, useBankAccounts, useCreateBankRule, useTestBankRule, useUpdateBankRule } from "@/features/banking/hooks";
import type { BankRuleFormValues, BankRuleTestValues } from "@/features/banking/schemas";
import type { BankRule } from "@/features/banking/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";


function createDraftRule(): BankRule {
  return {
    id: "",
    name: "",
    isActive: true,
    autoReconcile: false,
    priority: null,
    appliesToBankAccountId: null,
    matchPayeeContains: null,
    matchDescriptionContains: null,
    matchReferenceContains: null,
    matchAmountExact: null,
    matchAmountMin: null,
    matchAmountMax: null,
    direction: "money_out",
    actionType: "cash_code",
    targetAccountId: null,
    notes: null,
  };
}

function toPayload(values: BankRuleFormValues) {
  return {
    name: values.name.trim(),
    is_active: values.is_active,
    priority: values.priority ? Number.parseInt(values.priority, 10) : null,
    applies_to_bank_account_id: values.applies_to_bank_account_id || null,
    match_payee_contains: values.match_payee_contains?.trim() || null,
    match_description_contains: values.match_description_contains?.trim() || null,
    match_reference_contains: values.match_reference_contains?.trim() || null,
    match_amount_exact: values.match_amount_exact || null,
    match_amount_min: values.match_amount_min || null,
    match_amount_max: values.match_amount_max || null,
    direction: values.direction,
    action_type: values.action_type,
    target_account_id: values.target_account_id || null,
    auto_reconcile: values.auto_reconcile,
    notes: values.notes?.trim() || null,
  };
}

export default function BankRulesPage() {
  const { currentOrganizationId, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("bank_rules.read");
  const canCreate = can("bank_rules.create");
  const canUpdate = can("bank_rules.update");
  const canArchive = can("bank_rules.archive") || canUpdate;
  const [editingRule, setEditingRule] = React.useState<BankRule | null>(null);
  const [testingRule, setTestingRule] = React.useState<BankRule | null>(null);
  const [archivingRule, setArchivingRule] = React.useState<BankRule | null>(null);
  const bankRulesQuery = useBankRules(currentOrganizationId ?? undefined, canRead);
  const bankAccountsQuery = useBankAccounts(currentOrganizationId ?? undefined, "", can("bank_accounts.read"));
  const accountsQuery = useAccounts(currentOrganizationId ?? undefined, "", can("accounts.read"));
  const createMutation = useCreateBankRule(currentOrganizationId ?? undefined);
  const updateMutation = useUpdateBankRule(currentOrganizationId ?? undefined, editingRule?.id || undefined);
  const archiveMutation = useArchiveBankRule(currentOrganizationId ?? undefined, archivingRule?.id || undefined);
  const testMutation = useTestBankRule(currentOrganizationId ?? undefined, testingRule?.id || undefined);
  const [testResult, setTestResult] = React.useState<Record<string, unknown> | null>(null);

  async function handleCreate(values: BankRuleFormValues) {
    const rule = await createMutation.mutateAsync(toPayload(values));
    toast.success(`Created rule ${rule.name}`);
  }

  async function handleUpdate(values: BankRuleFormValues) {
    if (!editingRule) return;
    await updateMutation.mutateAsync(toPayload(values));
    toast.success(`Updated rule ${editingRule.name}`);
  }


  async function handleArchive(rule: BankRule) {
    setArchivingRule(rule);
    try {
      await archiveMutation.mutateAsync(rule.id);
      toast.success(`Archived rule ${rule.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive bank rule.");
    } finally {
      setArchivingRule(null);
    }
  }

  async function handleTest(values: BankRuleTestValues) {
    if (!currentOrganizationId || !testingRule) return;
    const result = await testMutation.mutateAsync({ sample_description: values.sample_description || null, sample_payee: values.sample_payee || null, sample_reference: values.sample_reference || null, sample_amount: values.sample_amount });
    setTestResult(result);
  }

  if (isLoadingOrganizations) return <LoadingScreen label="Loading bank rules" />;
  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Choose an organization before opening bank rules." />;
  if (!canRead) return <AccessDeniedState description="You need bank_rules.read to view bank rules." />;
  if (bankRulesQuery.isLoading || bankAccountsQuery.isLoading || accountsQuery.isLoading) return <LoadingScreen label="Loading bank rules" />;
  if (bankRulesQuery.isError || bankAccountsQuery.isError || accountsQuery.isError) return <ErrorState description="We couldn't load bank rule dependencies." onRetry={() => { void bankRulesQuery.refetch(); void bankAccountsQuery.refetch(); void accountsQuery.refetch(); }} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Banking" title="Bank rules" description="Manage deterministic banking rules for recurring reconciliation and cash coding patterns." actions={canCreate ? <Button onClick={() => setEditingRule(createDraftRule())}><Plus className="size-4" />New rule</Button> : null} />
      {(bankRulesQuery.data?.length ?? 0) > 0 ? <BankRuleListTable rules={bankRulesQuery.data ?? []} onEdit={setEditingRule} onTest={(rule) => { setTestingRule(rule); setTestResult(null); }} onArchive={handleArchive} canArchive={canArchive} /> : <EmptyState title="No bank rules yet" description="Create deterministic rules to speed up consistent banking decisions." action={canCreate ? <Button onClick={() => setEditingRule(createDraftRule())}>Create rule</Button> : undefined} />}
      <BankRuleFormDialog open={Boolean(editingRule)} onOpenChange={(open) => { if (!open) setEditingRule(null); }} rule={editingRule?.id ? editingRule : null} bankAccounts={bankAccountsQuery.data ?? []} accountOptions={accountsQuery.data ?? []} onSubmit={editingRule?.id ? handleUpdate : handleCreate} isSubmitting={editingRule?.id ? updateMutation.isPending : createMutation.isPending} />
      <BankRuleTestDialog open={Boolean(testingRule)} onOpenChange={(open) => { if (!open) { setTestingRule(null); setTestResult(null); } }} onSubmit={handleTest} result={testResult} isSubmitting={testMutation.isPending} />
    </div>
  );
}
