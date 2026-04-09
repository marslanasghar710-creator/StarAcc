"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBankAccounts } from "@/features/banking/hooks";
import {
  useCompleteIntegrationConnection,
  useDisconnectIntegration,
  useImportBankStatement,
  useIntegrationConnections,
  useIntegrationProviders,
  useIntegrationSyncRuns,
  useMapExternalAccount,
  useSourceAccounts,
  useStartIntegrationConnection,
  useTriggerIntegrationSync,
} from "@/features/integrations/hooks";
import { useOrganization } from "@/providers/organization-provider";

function parseCsvRows(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const [header, ...rows] = lines;
  if (!header) return [];
  const columns = header.split(",").map((c) => c.trim().toLowerCase());
  const idxDate = columns.indexOf("transaction_date");
  const idxDesc = columns.indexOf("description");
  const idxAmount = columns.indexOf("amount");
  const idxRef = columns.indexOf("reference");
  if (idxDate < 0 || idxDesc < 0 || idxAmount < 0) return [];
  return rows.map((line) => {
    const parts = line.split(",");
    return {
      transaction_date: parts[idxDate]?.trim(),
      description: parts[idxDesc]?.trim(),
      amount: Number(parts[idxAmount]),
      reference: idxRef >= 0 ? parts[idxRef]?.trim() : null,
    };
  }).filter((row) => row.transaction_date && row.description && Number.isFinite(row.amount));
}

export default function IntegrationsPage() {
  const { currentOrganizationId } = useOrganization();
  const providersQuery = useIntegrationProviders(currentOrganizationId ?? undefined);
  const connectionsQuery = useIntegrationConnections(currentOrganizationId ?? undefined);
  const startConnection = useStartIntegrationConnection(currentOrganizationId ?? undefined);
  const completeConnection = useCompleteIntegrationConnection(currentOrganizationId ?? undefined);
  const triggerSync = useTriggerIntegrationSync(currentOrganizationId ?? undefined);
  const disconnectConnection = useDisconnectIntegration(currentOrganizationId ?? undefined);
  const importStatement = useImportBankStatement(currentOrganizationId ?? undefined);

  const [selectedProvider, setSelectedProvider] = useState("bank_feed_sandbox");
  const [displayName, setDisplayName] = useState("Main bank feed");
  const [csvText, setCsvText] = useState("transaction_date,description,amount,reference\n2026-04-01,Coffee,-14.20,ref-100\n2026-04-02,Client Payment,1200.00,ref-101");

  const selectedConnectionId = connectionsQuery.data?.[0]?.id;
  const sourceAccountsQuery = useSourceAccounts(currentOrganizationId ?? undefined, selectedConnectionId);
  const syncRunsQuery = useIntegrationSyncRuns(currentOrganizationId ?? undefined, selectedConnectionId);
  const bankAccountsQuery = useBankAccounts(currentOrganizationId ?? undefined, undefined, true);
  const mapAccount = useMapExternalAccount(currentOrganizationId ?? undefined, selectedConnectionId);

  const availableProviders = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);

  if (!currentOrganizationId) return <EmptyState title="No organization selected" description="Select an organization before managing integrations." />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Connectivity" title="Integrations" description="Connect bank feeds, map accounts, import statements, monitor sync jobs, and handle failures safely." />

      <Card>
        <CardHeader><CardTitle>Provider catalog</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {availableProviders.map((provider) => (
            <div key={provider.key} className="rounded-lg border border-border/70 p-3 text-sm space-y-1">
              <p className="font-semibold">{provider.name}</p>
              <p className="text-muted-foreground">{provider.category} · auth: {provider.auth_type}</p>
              <p className="text-muted-foreground">{provider.supports_manual_import ? "Manual import" : "Feed only"} · {provider.is_entitled ? "Entitled" : "Not entitled"}</p>
              <div className="flex gap-1 flex-wrap">
                {provider.supports_pull ? <Badge variant="secondary">sync</Badge> : null}
                {provider.supports_webhooks ? <Badge variant="secondary">webhooks</Badge> : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Connect provider</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value)}>
            {availableProviders.map((provider) => <option key={provider.key} value={provider.key}>{provider.name}</option>)}
          </select>
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Connection display name" />
          <div className="flex gap-2">
            <Button onClick={() => startConnection.mutate({ provider_id: selectedProvider })} disabled={startConnection.isPending}>Start connection</Button>
            <Button variant="outline" onClick={() => completeConnection.mutate({ provider_id: selectedProvider, display_name: displayName, auth_payload: { consent: true } })} disabled={completeConnection.isPending}>Complete connection</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Connected integrations</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(connectionsQuery.data ?? []).map((connection) => (
            <div key={connection.id} className="rounded-lg border border-border/70 p-3 text-sm space-y-2">
              <p className="font-semibold">{connection.display_name}</p>
              <p className="text-muted-foreground">{connection.provider_key} · status: {connection.status}</p>
              <p className="text-muted-foreground">Last success: {connection.last_success_at ?? "never"} {connection.last_error_code ? `• error: ${connection.last_error_code}` : ""}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => triggerSync.mutate({ connectionId: connection.id, direction: "pull" })} disabled={triggerSync.isPending}>Run sync now</Button>
                <Button size="sm" variant="outline" onClick={() => disconnectConnection.mutate(connection.id)} disabled={disconnectConnection.isPending}>Disconnect</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account mapping</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {selectedConnectionId && sourceAccountsQuery.data?.accounts?.length ? (
            sourceAccountsQuery.data.accounts.map((source) => (
              <div key={source.external_account_id} className="rounded-lg border border-border/60 p-2 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{source.label}</p>
                  <p className="text-xs text-muted-foreground">{source.external_account_id}</p>
                </div>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2"
                  defaultValue=""
                  onChange={(event) => {
                    if (!event.target.value) return;
                    mapAccount.mutate({ external_account_id: source.external_account_id, bank_account_id: event.target.value });
                  }}
                >
                  <option value="">Map to bank account…</option>
                  {(bankAccountsQuery.data ?? []).map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
                </select>
              </div>
            ))
          ) : <p className="text-muted-foreground">Connect a provider to discover source accounts.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Manual statement import (CSV)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <textarea className="min-h-32 w-full rounded-md border border-input bg-background p-3 text-xs" value={csvText} onChange={(event) => setCsvText(event.target.value)} />
          <div className="flex gap-2">
            <select id="manual-bank" className="h-10 rounded-md border border-input bg-background px-3">
              {(bankAccountsQuery.data ?? []).map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
            </select>
            <Button
              onClick={() => {
                const selectEl = document.getElementById("manual-bank") as HTMLSelectElement | null;
                const bankAccountId = selectEl?.value;
                if (!bankAccountId) return;
                importStatement.mutate({ bank_account_id: bankAccountId, source_filename: "manual.csv", rows: parseCsvRows(csvText) });
              }}
              disabled={importStatement.isPending}
            >
              Import statement
            </Button>
          </div>
          {importStatement.data ? <p className="text-sm text-muted-foreground">Imported {importStatement.data.imported_count}, duplicates {importStatement.data.duplicate_count}, failed {importStatement.data.failed_count}.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sync history</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(syncRunsQuery.data ?? []).map((run) => (
            <div key={run.id} className="rounded border border-border/60 p-2">
              <p className="font-medium">{run.provider_key} · {run.status}</p>
              <p className="text-muted-foreground">seen {run.records_seen}, imported {run.records_created}, duplicates {run.records_skipped}, failed {run.records_failed}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
