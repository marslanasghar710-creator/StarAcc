"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { bankRuleTestSchema, type BankRuleTestValues } from "@/features/banking/schemas";

export function BankRuleTestDialog({ open, onOpenChange, onSubmit, result, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: BankRuleTestValues) => Promise<void>; result?: Record<string, unknown> | null; isSubmitting?: boolean; }) {
  const form = useForm<BankRuleTestValues>({ resolver: zodResolver(bankRuleTestSchema), defaultValues: { sample_description: "", sample_payee: "", sample_reference: "", sample_amount: "0" } });
  React.useEffect(() => { if (open) form.reset({ sample_description: "", sample_payee: "", sample_reference: "", sample_amount: "0" }); }, [form, open]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Test bank rule</DialogTitle><DialogDescription>Run the backend rule test endpoint with sample transaction data.</DialogDescription></DialogHeader><Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit(async (values) => { await onSubmit(values); })}><FormField control={form.control} name="sample_description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="sample_payee" render={({ field }) => (<FormItem><FormLabel>Payee</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="sample_reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="sample_amount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" /></FormControl><FormMessage /></FormItem>)} />{result ? <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre> : null}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Testing…" : "Run test"}</Button></DialogFooter></form></Form></DialogContent></Dialog>;
}
