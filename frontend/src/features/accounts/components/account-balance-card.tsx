import { DecimalDisplay } from "@/components/shared/decimal-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Account, AccountBalance } from "@/features/accounts/types";

export function AccountBalanceCard({ account, balance }: { account: Account; balance?: AccountBalance }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Current balance</CardTitle>
        <CardDescription>Backend-calculated balance snapshot for this ledger account.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">Closing debit</p>
          <p className="mt-2 text-2xl font-semibold"><DecimalDisplay value={balance?.closingDebit ?? 0} /></p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">Closing credit</p>
          <p className="mt-2 text-2xl font-semibold"><DecimalDisplay value={balance?.closingCredit ?? 0} /></p>
        </div>
        <div className="sm:col-span-2 rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
          Normal balance: <span className="font-medium capitalize text-foreground">{account.normalBalance}</span>
        </div>
      </CardContent>
    </Card>
  );
}
