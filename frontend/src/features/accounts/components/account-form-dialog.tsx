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
import { Textarea } from "@/components/ui/textarea";
import { accountFormSchema, type AccountFormValues } from "@/features/accounts/schemas";
import type { Account } from "@/features/accounts/types";
import { ApiError } from "@/lib/api/errors";

function getDefaultValues(account?: Account | null): AccountFormValues {
  return {
    code: account?.code ?? "",
    name: account?.name ?? "",
    description: account?.description ?? "",
    account_type: account?.accountType ?? "asset",
    account_subtype: account?.accountSubtype ?? "",
    parent_account_id: account?.parentAccountId ?? "",
    currency_code: account?.currencyCode ?? "",
    is_postable: account?.isPostable ?? true,
    is_active: account?.isActive ?? true,
  };
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  parentOptions,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  parentOptions: Account[];
  onSubmit: (values: AccountFormValues) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: getDefaultValues(account),
  });

  React.useEffect(() => {
    form.reset(getDefaultValues(account));
    setServerError(null);
  }, [account, form, open]);

  const isSystem = account?.isSystem ?? false;

  async function handleSubmit(values: AccountFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to save account.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{account ? `Edit ${account.code}` : "Create account"}</DialogTitle>
          <DialogDescription>Use the backend-backed chart of accounts structure to manage ledger posting targets.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={Boolean(account)} placeholder="1000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Cash at bank" disabled={isSystem && !account?.isActive} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={Boolean(account)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_subtype"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtype</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="Current asset" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parent_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent account</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No parent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No parent</SelectItem>
                        {parentOptions
                          .filter((option) => option.id !== account?.id)
                          .map((option) => (
                            <SelectItem key={option.id} value={option.id}>{option.code} · {option.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="USD" maxLength={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} placeholder="Optional account description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="is_postable"
                render={({ field }) => (
                  <FormItem className="rounded-lg border border-border/70 p-3">
                    <FormLabel className="flex items-center justify-between gap-3">
                      <span>Allow direct posting</span>
                      <input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} disabled={isSystem && !account?.isPostable} />
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">Disable for header/group accounts that should not receive journal lines directly.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="rounded-lg border border-border/70 p-3">
                    <FormLabel className="flex items-center justify-between gap-3">
                      <span>Active account</span>
                      <input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} disabled={isSystem && !account?.isActive} />
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">Inactive accounts remain visible historically but should be excluded from new use.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : account ? "Save changes" : "Create account"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
