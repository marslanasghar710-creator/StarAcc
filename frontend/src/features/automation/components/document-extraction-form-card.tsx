"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { documentExtractionFormSchema, type DocumentExtractionFormValues } from "@/features/automation/schemas";
import { ApiError } from "@/lib/api/errors";

export function DocumentExtractionFormCard({ onSubmit, isSubmitting }: { onSubmit: (values: DocumentExtractionFormValues) => Promise<void>; isSubmitting?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<DocumentExtractionFormValues>({ resolver: zodResolver(documentExtractionFormSchema), defaultValues: { file_id: "", entity_type: "bill", entity_id: "", document_type: "invoice" } });

  async function handleSubmit(values: DocumentExtractionFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
      form.reset(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to run document extraction.");
    }
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Run document extraction</CardTitle>
        <CardDescription>Submit a file or linked entity for backend document intelligence review.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <InlineValidationMessage message={serverError} />
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["file_id", "File ID", "file_123"],
                ["entity_type", "Entity type", "bill"],
                ["entity_id", "Entity ID", "bill_123"],
                ["document_type", "Document type", "supplier_invoice"],
              ].map(([name, label, placeholder]) => (
                <FormField key={name} control={form.control} name={name as keyof DocumentExtractionFormValues} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl><Input {...field} value={String(field.value ?? "")} placeholder={placeholder} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
            </div>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Run extraction"}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
