import { z } from "zod";

function jsonRefiner(value: string) {
  if (!value.trim()) return true;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export const automationRuleFormSchema = z.object({
  name: z.string().trim().min(1, "Rule name is required").max(120, "Rule name must be 120 characters or fewer"),
  rule_type: z.string().trim().min(1, "Rule type is required"),
  priority: z.string().trim().refine((value) => /^\d+$/.test(value), "Priority must be a whole number"),
  is_active: z.boolean(),
  description: z.string().trim().max(1000, "Description must be 1000 characters or fewer").optional().or(z.literal("")),
  entity_type: z.string().trim().max(80, "Entity type must be 80 characters or fewer").optional().or(z.literal("")),
  trigger_event: z.string().trim().max(80, "Trigger event must be 80 characters or fewer").optional().or(z.literal("")),
  action_type: z.string().trim().max(80, "Action type must be 80 characters or fewer").optional().or(z.literal("")),
  conditions_json: z.string().trim().refine(jsonRefiner, "Conditions must be valid JSON"),
  action_config_json: z.string().trim().refine(jsonRefiner, "Action config must be valid JSON").optional().or(z.literal("")),
});

export type AutomationRuleFormValues = z.infer<typeof automationRuleFormSchema>;

export const automationRuleTestSchema = z.object({
  sample_payload_json: z.string().trim().min(1, "Sample payload is required").refine(jsonRefiner, "Sample payload must be valid JSON"),
});

export type AutomationRuleTestValues = z.infer<typeof automationRuleTestSchema>;

export const documentExtractionFormSchema = z.object({
  file_id: z.string().trim().max(120, "File ID must be 120 characters or fewer").optional().or(z.literal("")),
  entity_type: z.string().trim().max(80, "Entity type must be 80 characters or fewer").optional().or(z.literal("")),
  entity_id: z.string().trim().max(120, "Entity ID must be 120 characters or fewer").optional().or(z.literal("")),
  document_type: z.string().trim().max(80, "Document type must be 80 characters or fewer").optional().or(z.literal("")),
}).refine((value) => Boolean(value.file_id || (value.entity_type && value.entity_id)), {
  message: "Provide a file ID or an entity type + entity ID",
  path: ["file_id"],
});

export type DocumentExtractionFormValues = z.infer<typeof documentExtractionFormSchema>;

export const entitySuggestionFormSchema = z.object({
  entity_type: z.string().trim().min(1, "Entity type is required"),
  entity_id: z.string().trim().min(1, "Entity ID is required"),
});

export type EntitySuggestionFormValues = z.infer<typeof entitySuggestionFormSchema>;

export const bankTransactionSuggestionFormSchema = z.object({
  bank_transaction_id: z.string().trim().min(1, "Bank transaction ID is required"),
});

export type BankTransactionSuggestionFormValues = z.infer<typeof bankTransactionSuggestionFormSchema>;
