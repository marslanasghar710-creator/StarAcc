"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bankAccountFormSchema, type BankAccountFormValues } from "@/features/banking/schemas";
import type { BankAccount } from "@/features/banking/types";
import type { Account } from "@/features/accounts/types";
import { ApiError } from "@/lib/api/errors";

function defaultValues(bankAccount?: BankAccount | null): BankAccountFormValues {
  return {
    name: bankAccount?.name ?? "",
    display_name: bankAccount?.displayName ?? "",
    bank_name: bankAccount?.bankName ?? "",
    account_number_masked: bankAccount?.accountNumberMasked ?? "",
    iban_masked: bankAccount?.ibanMasked ?? "",
    currency_code: bankAccount?.currencyCode ?? "USD",
    account_type: bankAccount?.accountType ?? "checking",
    gl_account_id: bankAccount?.glAccountId ?? "",
    opening_balance: bankAccount?.openingBalance ?? "0",
    opening_balance_date: bankAccount?.openingBalanceDate ?? "",
    is_active: bankAccount?.isActive ?? true,
    is_default_receipts_account: bankAccount?.isDefaultReceiptsAccount ?? false,
    is_default_payments_account: bankAccount?.isDefaultPaymentsAccount ?? false,
  };
}

export function BankAccountFormDialog({ open, onOpenChange, bankAccount, glAccounts, onSubmit, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; bankAccount?: BankAccount | null; glAccounts: Account[]; onSubmit: (values: BankAccountFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<BankAccountFormValues>({ resolver: zodResolver(bankAccountFormSchema), defaultValues: defaultValues(bankAccount) });

  React.useEffect(() => {
    form.reset(defaultValues(bankAccount));
    setServerError(null);
  }, [bankAccount, form, open]);

  async function handleSubmit(values: BankAccountFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save bank account.");
    }
  }

  const assetAccounts = glAccounts.filter((account) => account.isActive && account.accountType === "asset" && account.isPostable);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{bankAccount ? `Edit ${bankAccount.displayName || bankAccount.name}` : "Create bank account"}</DialogTitle>
          <DialogDescription>Maintain bank feed, GL mapping, and cashbook settings for the active organization.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} placeholder="Main operating account" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="display_name" render={({ field }) => (<FormItem><FormLabel>Display name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="Operating checking" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="bank_name" render={({ field }) => (<FormItem><FormLabel>Bank name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="First National" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="currency_code" render={({ field }) => (<FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field} maxLength={3} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="account_type" render={({ field }) => (<FormItem><FormLabel>Account type</FormLabel><Select value={field.value || "checking"} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="checking">Checking</SelectItem><SelectItem value="savings">Savings</SelectItem><SelectItem value="credit_card">Credit card</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="gl_account_id" render={({ field }) => (<FormItem><FormLabel>Linked GL account</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select asset account" /></SelectTrigger></FormControl><SelectContent>{assetAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.code} · {account.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="account_number_masked" render={({ field }) => (<FormItem><FormLabel>Account number (masked)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="****1234" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="iban_masked" render={({ field }) => (<FormItem><FormLabel>IBAN (masked)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="GB** ****" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="opening_balance" render={({ field }) => (<FormItem><FormLabel>Opening balance</FormLabel><FormControl><Input {...field} value={field.value ?? ""} inputMode="decimal" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="opening_balance_date" render={({ field }) => (<FormItem><FormLabel>Opening balance date</FormLabel><FormControl><Input {...field} type="date" value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["is_active", "Active account", "Inactive accounts remain historical only."],
                ["is_default_receipts_account", "Default receipts account", "Use as default for incoming cash."],
                ["is_default_payments_account", "Default payments account", "Use as default for outgoing cash."],
              ].map(([name, label, hint]) => (
                <FormField key={name} control={form.control} name={name as keyof BankAccountFormValues} render={({ field }) => (<FormItem className="rounded-lg border border-border/70 p-3"><FormLabel className="flex items-center justify-between gap-3"><span>{label}</span><input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} /></FormLabel><p className="text-sm text-muted-foreground">{hint}</p><FormMessage /></FormItem>)} />
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : bankAccount ? "Save changes" : "Create bank account"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
