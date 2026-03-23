import Link from "next/link";

import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PayrollLiability, PayrollSummary } from "@/features/payroll/types";

export function PayrollSummaryCards({ summary, liabilities, currencyCode }: { summary?: PayrollSummary | null; liabilities: PayrollLiability[]; currencyCode?: string | null; }) {
  const topLiabilities = liabilities.slice(0, 4);

  return (
    <div className="grid gap-4 xl:grid-cols-[repeat(3,minmax(0,1fr))_1.25fr]">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Total gross</CardTitle>
          <CardDescription>Backend payroll summary across current organization runs.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-2xl font-semibold"><MoneyDisplay value={summary?.totalGross ?? 0} currencyCode={summary?.currencyCode || currencyCode} /></p></CardContent>
      </Card>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Total deductions</CardTitle>
          <CardDescription>Combined statutory and configured deduction totals.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-2xl font-semibold"><MoneyDisplay value={summary?.totalDeductions ?? 0} currencyCode={summary?.currencyCode || currencyCode} /></p></CardContent>
      </Card>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Total net</CardTitle>
          <CardDescription>Net payable from posted and calculated runs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-semibold"><MoneyDisplay value={summary?.totalNet ?? 0} currencyCode={summary?.currencyCode || currencyCode} /></p>
          <p className="text-sm text-muted-foreground">{summary?.activeEmployees ?? 0} active employees · {summary?.payrollRuns ?? 0} runs</p>
          {summary?.lastPostedRunId ? <Link href={`/payroll/runs/${summary.lastPostedRunId}`} className="text-sm text-primary hover:underline">Open latest posted run</Link> : null}
        </CardContent>
      </Card>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Payroll liabilities</CardTitle>
          <CardDescription>Amounts due remain backend-calculated and date-driven.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topLiabilities.length === 0 ? <p className="text-sm text-muted-foreground">No payroll liabilities returned yet.</p> : null}
          {topLiabilities.map((liability) => (
            <div key={liability.id} className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
              <div>
                <p className="font-medium">{liability.name}</p>
                <p className="text-xs text-muted-foreground">Due <DateDisplay value={liability.dueDate} /></p>
              </div>
              <div className="text-right">
                <p className="font-medium"><MoneyDisplay value={liability.amountDue} currencyCode={currencyCode} /></p>
                <p className="text-xs text-muted-foreground capitalize">{liability.status.replaceAll("_", " ")}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
