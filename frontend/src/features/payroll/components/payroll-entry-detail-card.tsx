import { DateDisplay } from "@/components/shared/date-display";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PayrollComponentLine, PayrollEntry } from "@/features/payroll/types";
import { PayrollStatusBadge } from "@/features/payroll/components/payroll-status-badge";

function Section({ title, lines, currencyCode }: { title: string; lines: PayrollComponentLine[]; currencyCode?: string | null }) {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 p-4">
      <h4 className="font-medium">{title}</h4>
      {lines.length === 0 ? <p className="text-sm text-muted-foreground">No lines returned for this section.</p> : null}
      {lines.map((line) => (
        <div key={`${title}-${line.id ?? line.name}-${line.amount}`} className="flex items-start justify-between gap-4 text-sm">
          <div>
            <p className="font-medium">{line.name}</p>
            <p className="text-muted-foreground">{line.code || line.category || line.type}</p>
          </div>
          <MoneyDisplay value={line.amount} currencyCode={currencyCode} className="font-medium" />
        </div>
      ))}
    </div>
  );
}

export function PayrollEntryDetailCard({ entry, currencyCode }: { entry: PayrollEntry; currencyCode?: string | null }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{entry.employeeName}</CardTitle>
        <CardDescription>Per-employee payslip detail sourced from backend payroll entry data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div><p className="text-sm text-muted-foreground">Status</p><div className="mt-1"><PayrollStatusBadge value={entry.status} /></div></div>
          <div><p className="text-sm text-muted-foreground">Gross pay</p><p className="mt-1 font-semibold"><MoneyDisplay value={entry.grossPay} currencyCode={currencyCode} /></p></div>
          <div><p className="text-sm text-muted-foreground">Deductions</p><p className="mt-1 font-semibold"><MoneyDisplay value={entry.deductionsTotal} currencyCode={currencyCode} /></p></div>
          <div><p className="text-sm text-muted-foreground">Net pay</p><p className="mt-1 font-semibold"><MoneyDisplay value={entry.netPay} currencyCode={currencyCode} /></p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><p className="text-sm text-muted-foreground">Employment</p><p className="mt-1 text-sm">{entry.employmentStatus || "—"} · {entry.employmentType || "—"}</p></div>
          <div><p className="text-sm text-muted-foreground">Pay date</p><p className="mt-1 text-sm"><DateDisplay value={entry.payDate} /></p></div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Earnings" lines={entry.earnings} currencyCode={currencyCode} />
          <Section title="Deductions" lines={entry.deductions} currencyCode={currencyCode} />
          <Section title="Employer costs" lines={entry.employerCosts} currencyCode={currencyCode} />
          <Section title="Liabilities" lines={entry.liabilities} currencyCode={currencyCode} />
        </div>
        {entry.notes ? <div className="rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">{entry.notes}</div> : null}
      </CardContent>
    </Card>
  );
}
