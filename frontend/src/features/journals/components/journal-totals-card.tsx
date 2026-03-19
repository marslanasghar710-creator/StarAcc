import { DecimalDisplay } from "@/components/shared/decimal-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function JournalTotalsCard({ totalDebit, totalCredit, isBalanced }: { totalDebit: string; totalCredit: string; isBalanced: boolean }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Totals</CardTitle>
        <CardDescription>Shown for review only. Backend validation remains authoritative.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Total debit</p>
            <p className="mt-2 text-xl font-semibold"><DecimalDisplay value={totalDebit} /></p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Total credit</p>
            <p className="mt-2 text-xl font-semibold"><DecimalDisplay value={totalCredit} /></p>
          </div>
        </div>
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${isBalanced ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"}`}>
          {isBalanced ? "Draft appears balanced." : "Draft does not balance yet."}
        </div>
      </CardContent>
    </Card>
  );
}
