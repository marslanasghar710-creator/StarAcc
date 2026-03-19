"use client";

import { Trash2 } from "lucide-react";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";

import { DecimalDisplay } from "@/components/shared/decimal-display";
import { getJournalDraftTotals } from "@/features/journals/schemas";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Account } from "@/features/accounts/types";
import type { JournalFormValues } from "@/features/journals/schemas";

export function JournalLinesEditor({
  form,
  fieldArray,
  accountOptions,
  readOnly = false,
}: {
  form: UseFormReturn<JournalFormValues>;
  fieldArray: UseFieldArrayReturn<JournalFormValues, "lines", "id">;
  accountOptions: Account[];
  readOnly?: boolean;
}) {
  const lines = form.watch("lines");
  const totals = getJournalDraftTotals(lines);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Line</th>
              <th className="px-3 py-2 text-left font-medium">Account</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium">Debit</th>
              <th className="px-3 py-2 text-right font-medium">Credit</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fieldArray.fields.map((field, index) => (
              <tr key={field.id} className="border-t border-border/60 align-top">
                <td className="px-3 py-3 text-muted-foreground">{index + 1}</td>
                <td className="px-3 py-3">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.account_id`}
                    render={({ field: currentField }) => (
                      <FormItem>
                        <Select value={currentField.value} onValueChange={currentField.onChange} disabled={readOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accountOptions.filter((account) => account.isActive && account.isPostable).map((account) => (
                              <SelectItem key={account.id} value={account.id}>{account.code} · {account.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </td>
                <td className="px-3 py-3">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.description`}
                    render={({ field: currentField }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...currentField} value={currentField.value ?? ""} placeholder="Optional line memo" disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.debit_amount`}
                    render={({ field: currentField }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...currentField} inputMode="decimal" className="text-right tabular-nums" disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.credit_amount`}
                    render={({ field: currentField }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...currentField} inputMode="decimal" className="text-right tabular-nums" disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={readOnly || fieldArray.fields.length <= 2}
                    onClick={() => fieldArray.remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-3">
        <p className="text-sm text-muted-foreground">Use draft totals for guidance only. Backend posting validation remains authoritative.</p>
        <Button type="button" variant="outline" onClick={() => fieldArray.append({ account_id: "", description: "", debit_amount: "0", credit_amount: "0" })} disabled={readOnly}>Add line</Button>
      </div>
      <div className="grid gap-3 border-t border-border/60 px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="text-muted-foreground">Line count</span>
          <div className="font-medium">{fieldArray.fields.length}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Selected accounts</span>
          <div className="font-medium">{lines.filter((line) => line.account_id).length}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Running debit</span>
          <div className="font-medium"><DecimalDisplay value={totals.totalDebit} /></div>
        </div>
        <div>
          <span className="text-muted-foreground">Rows with amounts</span>
          <div className="font-medium">{lines.filter((line) => line.debit_amount !== "0" || line.credit_amount !== "0").length}</div>
        </div>
      </div>
    </div>
  );
}
