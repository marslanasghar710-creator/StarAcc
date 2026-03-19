import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountStatusBadge } from "@/features/accounts/components/account-status-badge";
import type { Account } from "@/features/accounts/types";

export function AccountDetailPanel({ account, parentAccountName }: { account: Account; parentAccountName?: string | null }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Account details</CardTitle>
        <CardDescription>Structure, posting flags, and metadata supplied by the backend.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <AccountStatusBadge kind="type" value={account.accountType} />
          <AccountStatusBadge kind="active" value={account.isActive} />
          <AccountStatusBadge kind="postable" value={account.isPostable} />
          <AccountStatusBadge kind="system" value={account.isSystem} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Code</dt>
            <dd className="mt-1 font-medium">{account.code}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Name</dt>
            <dd className="mt-1 font-medium">{account.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Subtype</dt>
            <dd className="mt-1">{account.accountSubtype || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Currency</dt>
            <dd className="mt-1">{account.currencyCode || <span className="text-muted-foreground">Base currency</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Parent account</dt>
            <dd className="mt-1">
              {account.parentAccountId ? (
                <Button asChild variant="link" className="h-auto px-0 py-0 font-medium">
                  <Link href={`/accounts/${account.parentAccountId}`}>{parentAccountName ?? account.parentAccountId}</Link>
                </Button>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Normal balance</dt>
            <dd className="mt-1 capitalize">{account.normalBalance}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap">{account.description || <span className="text-muted-foreground">No description provided.</span>}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Created</dt>
            <dd className="mt-1"><DateDisplay value={account.createdAt} includeTime /></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Updated</dt>
            <dd className="mt-1"><DateDisplay value={account.updatedAt} includeTime /></dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
