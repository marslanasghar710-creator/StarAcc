"use client";

import { Trash2 } from "lucide-react";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";

import { MoneyDisplay } from "@/components/shared/money-display";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Account } from "@/features/accounts/types";
import { getBillDraftPreview, type BillFormValues } from "@/features/bills/schemas";

export function BillLineItemsEditor({ form, fieldArray, accountOptions, currencyCode, readOnly = false }: { form: UseFormReturn<BillFormValues>; fieldArray: UseFieldArrayReturn<BillFormValues, "items", "id">; accountOptions: Account[]; currencyCode?: string; readOnly?: boolean; }) {
  const items = form.watch("items");
  const preview = getBillDraftPreview(items);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1260px] text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-left font-medium">Item code</th>
              <th className="px-3 py-2 text-left font-medium">Expense account</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Unit price</th>
              <th className="px-3 py-2 text-right font-medium">Disc. %</th>
              <th className="px-3 py-2 text-right font-medium">Disc. amt</th>
              <th className="px-3 py-2 text-right font-medium">Preview subtotal</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fieldArray.fields.map((field, index) => {
              const linePreview = getBillDraftPreview([{ quantity: items[index]?.quantity, unit_price: items[index]?.unit_price }]);
              return (
                <tr key={field.id} className="border-t border-border/60 align-top">
                  <td className="px-3 py-3 text-muted-foreground">{index + 1}</td>
                  <td className="px-3 py-3"><FormField control={form.control} name={`items.${index}.description`} render={({ field: currentField }) => (<FormItem><FormControl><Input {...currentField} value={currentField.value ?? ""} disabled={readOnly} placeholder="Goods or service description" /></FormControl><FormMessage /></FormItem>)} /></td>
                  <td className="px-3 py-3"><FormField control={form.control} name={`items.${index}.item_code`} render={({ field: currentField }) => (<FormItem><FormControl><Input {...currentField} value={currentField.value ?? ""} disabled={readOnly} placeholder="Optional SKU" /></FormControl><FormMessage /></FormItem>)} /></td>
                  <td className="px-3 py-3"><FormField control={form.control} name={`items.${index}.account_id`} render={({ field: currentField }) => (<FormItem><Select value={currentField.value} onValueChange={currentField.onChange} disabled={readOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger></FormControl><SelectContent>{accountOptions.filter((account) => account.isActive && account.isPostable).map((account) => <SelectItem key={account.id} value={account.id}>{account.code} · {account.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /></td>
                  <td className="px-3 py-3"><FormField control={form.control} name={`items.${index}.quantity`} render={({ field: currentField }) => (<FormItem><FormControl><Input {...currentField} value={currentField.value ?? ""} disabled={readOnly} inputMode="decimal" className="text-right tabular-nums" /></FormControl><FormMessage /></FormItem>)} /></td>
                  <td className="px-3 py-3"><FormField control={form.control} name={`items.${index}.unit_price`} render={({ field: currentField }) => (<FormItem><FormControl><Input {...currentField} value={currentField.value ?? ""} disabled={readOnly} inputMode="decimal" className="text-right tabular-nums" /></FormControl><FormMessage /></FormItem>)} /></td>
                  <td className="px-3 py-3"><FormField control={form.control} name={`items.${index}.discount_percent`} render={({ field: currentField }) => (<FormItem><FormControl><Input {...currentField} value={currentField.value ?? ""} disabled={readOnly} inputMode="decimal" className="text-right tabular-nums" /></FormControl><FormMessage /></FormItem>)} /></td>
                  <td className="px-3 py-3"><FormField control={form.control} name={`items.${index}.discount_amount`} render={({ field: currentField }) => (<FormItem><FormControl><Input {...currentField} value={currentField.value ?? ""} disabled={readOnly} inputMode="decimal" className="text-right tabular-nums" /></FormControl><FormMessage /></FormItem>)} /></td>
                  <td className="px-3 py-3 text-right font-medium"><MoneyDisplay value={linePreview.previewSubtotal} currencyCode={currencyCode} className="justify-end" /></td>
                  <td className="px-3 py-3 text-right"><Button type="button" variant="ghost" size="icon" aria-label={`Remove line ${index + 1}`} disabled={readOnly || fieldArray.fields.length <= 1} onClick={() => fieldArray.remove(index)}><Trash2 className="size-4" /></Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-3">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Client preview only. Discounts, taxes, totals, and posting validation remain backend authoritative.</p>
          <p>Draft line subtotal preview: <MoneyDisplay value={preview.previewSubtotal} currencyCode={currencyCode} /></p>
        </div>
        <Button type="button" variant="outline" onClick={() => fieldArray.append({ description: "", item_code: "", account_id: "", quantity: "1", unit_price: "0", discount_percent: "", discount_amount: "", tax_code_id: "" })} disabled={readOnly}>Add line item</Button>
      </div>
    </div>
  );
}
