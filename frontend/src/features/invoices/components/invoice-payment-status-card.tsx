import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { getInvoicePaymentTone } from "@/features/invoices/schemas";
import type { Invoice } from "@/features/invoices/types";

export function InvoicePaymentStatusCard({ invoice }: { invoice: Invoice }) {
  const tone = getInvoicePaymentTone(invoice);
  const label = tone === "success" ? "Paid" : tone === "warning" ? "Partially paid" : tone === "danger" ? (invoice.status === "voided" || invoice.status === "cancelled" ? "Closed" : "Overdue") : "Open";

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Payment status</CardTitle>
        <CardDescription>Backend-reported payment allocation effects and collection visibility.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant={tone}>{label}</Badge>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Amount paid</span><MoneyDisplay value={invoice.amountPaid} currencyCode={invoice.currencyCode} /></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Amount due</span><MoneyDisplay value={invoice.amountDue} currencyCode={invoice.currencyCode} /></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Due date</span><span>{invoice.dueDate}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Sent</span><span>{invoice.sentAt ? "Yes" : "No"}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Posted</span><span>{invoice.postedAt ? "Yes" : "No"}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}
