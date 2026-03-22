"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { bankImportUploadSchema, type BankImportUploadValues } from "@/features/banking/schemas";
import type { BankAccount } from "@/features/banking/types";
import { ApiError } from "@/lib/api/errors";

export function BankImportUploadDialog({ open, onOpenChange, bankAccounts, onSubmit, isSubmitting }: { open: boolean; onOpenChange: (open: boolean) => void; bankAccounts: BankAccount[]; onSubmit: (values: BankImportUploadValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<BankImportUploadValues>({ resolver: zodResolver(bankImportUploadSchema), defaultValues: { bank_account_id: bankAccounts[0]?.id ?? "", source: "csv", mapping_json: "", file: undefined as unknown as File } });

  React.useEffect(() => {
    if (open) {
      form.reset({ bank_account_id: bankAccounts[0]?.id ?? "", source: "csv", mapping_json: "", file: undefined as unknown as File });
      setServerError(null);
    }
  }, [bankAccounts, form, open]);

  async function handleSubmit(values: BankImportUploadValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to import statement.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import bank statement</DialogTitle>
          <DialogDescription>Upload a statement file for deterministic backend import, duplicate checks, and transaction creation.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <FormField control={form.control} name="bank_account_id" render={({ field }) => (<FormItem><FormLabel>Bank account</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger></FormControl><SelectContent>{bankAccounts.map((bankAccount) => <SelectItem key={bankAccount.id} value={bankAccount.id}>{bankAccount.displayName || bankAccount.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="source" render={({ field }) => (<FormItem><FormLabel>Source</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="mapping_json" render={({ field }) => (<FormItem><FormLabel>Optional mapping JSON</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} placeholder='{"date_column":"A"}' /></FormControl><FormMessage /></FormItem>)} />
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value: _value, ...field } }) => (
                <FormItem>
                  <FormLabel>Statement file</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="file"
                      accept=".csv,.ofx,.qif,.txt"
                      onChange={(event) => onChange(event.target.files?.[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Importing…" : <><Upload className="size-4" />Import statement</>}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
