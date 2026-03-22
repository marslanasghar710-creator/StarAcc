export type RawAssetCategory = Record<string, unknown>;
export type RawAsset = Record<string, unknown>;
export type RawDepreciationScheduleLine = Record<string, unknown>;
export type RawDepreciationRun = Record<string, unknown>;
export type RawAssetRegisterRow = Record<string, unknown>;
export type RawAssetValuation = Record<string, unknown>;
export type RawAssetDepreciationSummary = Record<string, unknown>;

export type AssetDepreciationMethod = "straight_line" | "declining_balance" | "units_of_production" | string;
export type AssetStatus = "draft" | "active" | "disposed" | "fully_depreciated" | "archived" | string;
export type DepreciationScheduleLineStatus = "scheduled" | "posted" | "reversed" | string;
export type DepreciationRunStatus = "draft" | "completed" | "posted" | "failed" | string;

export type AssetCategory = {
  id: string;
  organizationId: string | null;
  name: string;
  defaultUsefulLifeMonths: number | null;
  depreciationMethod: AssetDepreciationMethod;
  assetAccountId: string | null;
  accumulatedDepreciationAccountId: string | null;
  depreciationExpenseAccountId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type Asset = {
  id: string;
  organizationId: string | null;
  assetCategoryId: string | null;
  assetCategoryName: string | null;
  name: string;
  description: string | null;
  acquisitionDate: string | null;
  acquisitionCost: string;
  usefulLifeMonths: number | null;
  depreciationMethod: AssetDepreciationMethod;
  residualValue: string;
  depreciationStartDate: string | null;
  accumulatedDepreciation: string;
  netBookValue: string;
  status: AssetStatus;
  assetAccountId: string | null;
  accumulatedDepreciationAccountId: string | null;
  depreciationExpenseAccountId: string | null;
  disposalDate: string | null;
  disposalProceeds: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AssetRegisterRow = {
  id: string;
  assetId: string;
  name: string;
  categoryName: string | null;
  acquisitionDate: string | null;
  acquisitionCost: string;
  depreciationMethod: AssetDepreciationMethod;
  usefulLifeMonths: number | null;
  accumulatedDepreciation: string;
  netBookValue: string;
  status: AssetStatus;
};

export type DepreciationScheduleLine = {
  id: string;
  periodDate: string | null;
  depreciationAmount: string;
  accumulatedDepreciation: string;
  netBookValue: string;
  status: DepreciationScheduleLineStatus;
  postedAt: string | null;
};

export type DepreciationRunRecord = {
  id: string;
  runDate: string | null;
  throughDate: string | null;
  status: DepreciationRunStatus;
  assetCount: number | null;
  totalDepreciation: string;
  createdAt: string | null;
  postedAt: string | null;
};

export type AssetValuationSummary = {
  totalAssetCost: string;
  totalAccumulatedDepreciation: string;
  totalNetBookValue: string;
  activeAssetCount: number;
  disposedAssetCount: number;
};

export type AssetDepreciationSummary = {
  currentPeriodDepreciation: string;
  yearToDateDepreciation: string;
  lifeToDateDepreciation: string;
  lastRunAt: string | null;
};

export type AssetCategoryMutationPayload = {
  name: string;
  default_useful_life_months?: number | null;
  depreciation_method: string;
  asset_account_id?: string | null;
  accumulated_depreciation_account_id?: string | null;
  depreciation_expense_account_id?: string | null;
};

export type AssetMutationPayload = {
  name: string;
  description?: string | null;
  asset_category_id?: string | null;
  acquisition_date?: string | null;
  acquisition_cost: string;
  useful_life_months?: number | null;
  depreciation_method: string;
  residual_value?: string | null;
  depreciation_start_date?: string | null;
};

export type DepreciationRunPayload = {
  through_date: string;
};

export type AssetDisposalPayload = {
  disposal_date: string;
  disposal_proceeds?: string | null;
  notes?: string | null;
};
