import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import type { Invoice } from "@/features/invoices/types";

export function InvoiceTotalsCard({ invoice, previewSubtotal }: { invoice?: Invoice | null; previewSubtotal?: string }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Totals</CardTitle>
        <CardDescription>Backend totals remain authoritative. Draft preview is shown where backend totals are not yet available.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><MoneyDisplay value={invoice?.subtotalAmount ?? previewSubtotal ?? 0} currencyCode={invoice?.currencyCode} /></div>
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Tax</span><MoneyDisplay value={invoice?.taxAmount ?? 0} currencyCode={invoice?.currencyCode} /></div>
        <div className="flex items-center justify-between text-base font-semibold"><span>Total</span><MoneyDisplay value={invoice?.totalAmount ?? previewSubtotal ?? 0} currencyCode={invoice?.currencyCode} /></div>
      </CardContent>
    </Card>
  );
}
