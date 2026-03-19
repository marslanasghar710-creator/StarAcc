"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { invoiceSendSchema, type InvoiceSendFormValues } from "@/features/invoices/schemas";

export function InvoiceSendDialog({
  open,
  onOpenChange,
  defaultRecipient,
  onConfirm,
  isSubmitting,
  error,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRecipient?: string | null;
  onConfirm: (values: InvoiceSendFormValues) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
  mode: "send" | "send-email";
}) {
  const form = useForm<InvoiceSendFormValues>({
    resolver: zodResolver(invoiceSendSchema),
    defaultValues: { recipient_email: defaultRecipient ?? "" },
  });

  React.useEffect(() => {
    if (open) form.reset({ recipient_email: defaultRecipient ?? "" });
  }, [defaultRecipient, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "send-email" ? "Send invoice email" : "Mark invoice as sent"}</DialogTitle>
          <DialogDescription>{mode === "send-email" ? "The backend email workflow remains authoritative. Recipient overrides are shown for confirmation only if supported by the API." : "This uses the backend send transition and updates sent state only if the server accepts it."}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(async (values) => onConfirm(values))}>
            <InlineValidationMessage message={error} />
            <FormField
              control={form.control}
              name="recipient_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient email</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} disabled={mode !== "send-email"} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send invoice"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
