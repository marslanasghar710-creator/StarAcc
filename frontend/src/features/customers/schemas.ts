import { z } from "zod";

export const customerFormSchema = z.object({
  display_name: z.string().trim().min(1, "Display name is required").max(255, "Display name must be 255 characters or fewer"),
  legal_name: z.string().trim().max(255, "Legal name must be 255 characters or fewer").optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(50, "Phone must be 50 characters or fewer").optional().or(z.literal("")),
  website: z.string().trim().url("Enter a valid website URL").optional().or(z.literal("")),
  tax_number: z.string().trim().max(100, "Tax number must be 100 characters or fewer").optional().or(z.literal("")),
  currency_code: z.string().trim().max(3, "Currency code must be 3 characters or fewer").optional().or(z.literal("")),
  payment_terms_days: z.string().trim().regex(/^$|^\d+$/, "Payment terms must be a whole number"),
  notes: z.string().trim().max(5000, "Notes must be 5000 characters or fewer").optional().or(z.literal("")),
  billing_address_line1: z.string().trim().max(255).optional().or(z.literal("")),
  billing_address_line2: z.string().trim().max(255).optional().or(z.literal("")),
  billing_city: z.string().trim().max(100).optional().or(z.literal("")),
  billing_state: z.string().trim().max(100).optional().or(z.literal("")),
  billing_postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  billing_country: z.string().trim().max(100).optional().or(z.literal("")),
  shipping_address_line1: z.string().trim().max(255).optional().or(z.literal("")),
  shipping_address_line2: z.string().trim().max(255).optional().or(z.literal("")),
  shipping_city: z.string().trim().max(100).optional().or(z.literal("")),
  shipping_state: z.string().trim().max(100).optional().or(z.literal("")),
  shipping_postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  shipping_country: z.string().trim().max(100).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
