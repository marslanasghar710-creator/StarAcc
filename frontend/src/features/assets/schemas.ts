import { z } from "zod";

const decimalPattern = /^-?\d+(?:\.\d{1,8})?$/;

export const assetCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(255, "Category name must be 255 characters or fewer"),
  default_useful_life_months: z.string().trim().refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0), "Useful life must be a positive whole number of months").optional(),
  depreciation_method: z.string().trim().min(1, "Depreciation method is required"),
  asset_account_id: z.string().uuid("Select a valid asset account").optional().or(z.literal("")),
  accumulated_depreciation_account_id: z.string().uuid("Select a valid accumulated depreciation account").optional().or(z.literal("")),
  depreciation_expense_account_id: z.string().uuid("Select a valid depreciation expense account").optional().or(z.literal("")),
});

export type AssetCategoryFormValues = z.infer<typeof assetCategoryFormSchema>;

export const assetFormSchema = z.object({
  name: z.string().trim().min(1, "Asset name is required").max(255, "Asset name must be 255 characters or fewer"),
  description: z.string().trim().max(2000, "Description must be 2000 characters or fewer").optional().or(z.literal("")),
  asset_category_id: z.string().uuid("Select a valid asset category").optional().or(z.literal("")),
  acquisition_date: z.string().trim().min(1, "Acquisition date is required"),
  acquisition_cost: z.string().trim().refine((value) => decimalPattern.test(value) && Number(value) >= 0, "Acquisition cost must be a valid decimal amount"),
  useful_life_months: z.string().trim().refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0), "Useful life must be a positive whole number of months").optional(),
  depreciation_method: z.string().trim().min(1, "Depreciation method is required"),
  residual_value: z.string().trim().refine((value) => value === "" || (decimalPattern.test(value) && Number(value) >= 0), "Residual value must be a valid decimal amount").optional(),
  depreciation_start_date: z.string().trim().min(1, "Depreciation start date is required"),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export const assetDisposalFormSchema = z.object({
  disposal_date: z.string().trim().min(1, "Disposal date is required"),
  disposal_proceeds: z.string().trim().refine((value) => value === "" || decimalPattern.test(value), "Enter a valid decimal amount").optional(),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or fewer").optional().or(z.literal("")),
});

export type AssetDisposalFormValues = z.infer<typeof assetDisposalFormSchema>;

export const depreciationRunFormSchema = z.object({
  through_date: z.string().trim().min(1, "Through date is required"),
});

export type DepreciationRunFormValues = z.infer<typeof depreciationRunFormSchema>;
