import { z } from "zod";

export const accountFormSchema = z.object({
  code: z.string().trim().min(1, "Account code is required").max(50, "Account code must be 50 characters or fewer"),
  name: z.string().trim().min(1, "Account name is required").max(255, "Account name must be 255 characters or fewer"),
  description: z.string().trim().max(500, "Description must be 500 characters or fewer").optional().or(z.literal("")),
  account_type: z.enum(["asset", "liability", "equity", "revenue", "expense"], { required_error: "Account type is required" }),
  account_subtype: z.string().trim().max(100, "Subtype must be 100 characters or fewer").optional().or(z.literal("")),
  parent_account_id: z.string().uuid("Parent account must be valid").optional().or(z.literal("")),
  currency_code: z.string().trim().max(3, "Currency code must be 3 characters or fewer").optional().or(z.literal("")),
  is_postable: z.boolean(),
  is_active: z.boolean(),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;
