import type { BadgeProps } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillPaymentTone } from "@/features/bills/schemas";
import type { Bill } from "@/features/bills/types";

export function BillPaymentStatusCard({ bill }: { bill: Bill }) {
  const tone = getBillPaymentTone(bill);
  const label = tone === "success" ? "Paid" : tone === "warning" ? "Partially paid" : tone === "danger" ? (bill.status === "voided" || bill.status === "cancelled" ? "Closed" : "Overdue") : "Open";
  const variant: BadgeProps["variant"] = tone;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Payment status</CardTitle>
        <CardDescription>Backend-reported payable settlement visibility and due-state signals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant={variant}>{label}</Badge>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Amount paid</span><MoneyDisplay value={bill.amountPaid} currencyCode={bill.currencyCode} /></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Amount due</span><MoneyDisplay value={bill.amountDue} currencyCode={bill.currencyCode} /></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Due date</span><span>{bill.dueDate}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Posted</span><span>{bill.postedAt ? "Yes" : "No"}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Overdue</span><span>{tone === "danger" && bill.status !== "voided" && bill.status !== "cancelled" ? "Yes" : "No"}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}
