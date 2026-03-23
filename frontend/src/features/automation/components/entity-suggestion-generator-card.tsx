"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { bankTransactionSuggestionFormSchema, entitySuggestionFormSchema, type BankTransactionSuggestionFormValues, type EntitySuggestionFormValues } from "@/features/automation/schemas";
import { ApiError } from "@/lib/api/errors";

export function EntitySuggestionGeneratorCard({ onGenerateBankSuggestions, onGenerateCodingSuggestions, isGeneratingBankSuggestions, isGeneratingCodingSuggestions }: { onGenerateBankSuggestions: (values: BankTransactionSuggestionFormValues) => Promise<void>; onGenerateCodingSuggestions: (values: EntitySuggestionFormValues) => Promise<void>; isGeneratingBankSuggestions?: boolean; isGeneratingCodingSuggestions?: boolean; }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const bankForm = useForm<BankTransactionSuggestionFormValues>({ resolver: zodResolver(bankTransactionSuggestionFormSchema), defaultValues: { bank_transaction_id: "" } });
  const codingForm = useForm<EntitySuggestionFormValues>({ resolver: zodResolver(entitySuggestionFormSchema), defaultValues: { entity_type: "bill", entity_id: "" } });

  async function handleBankSubmit(values: BankTransactionSuggestionFormValues) {
    setServerError(null);
    try {
      await onGenerateBankSuggestions(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to generate bank transaction suggestions.");
    }
  }

  async function handleCodingSubmit(values: EntitySuggestionFormValues) {
    setServerError(null);
    try {
      await onGenerateCodingSuggestions(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to generate coding suggestions.");
    }
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Generate explainable suggestions</CardTitle>
        <CardDescription>Trigger backend assistance explicitly. Nothing is auto-applied silently.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <InlineValidationMessage message={serverError} />
        <Form {...bankForm}>
          <form className="space-y-3" onSubmit={bankForm.handleSubmit(handleBankSubmit)}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <FormField control={bankForm.control} name="bank_transaction_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank transaction ID</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="txn_123" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={isGeneratingBankSuggestions}>{isGeneratingBankSuggestions ? "Generating…" : "Generate bank suggestions"}</Button>
            </div>
          </form>
        </Form>
        <Form {...codingForm}>
          <form className="space-y-3" onSubmit={codingForm.handleSubmit(handleCodingSubmit)}>
            <div className="grid gap-3 md:grid-cols-3 md:items-end">
              <FormField control={codingForm.control} name="entity_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity type</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="bill" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={codingForm.control} name="entity_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity ID</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="bill_123" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={isGeneratingCodingSuggestions}>{isGeneratingCodingSuggestions ? "Generating…" : "Generate coding suggestions"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
