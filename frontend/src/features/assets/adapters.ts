import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type {
  Asset,
  AssetCategory,
  AssetDepreciationSummary,
  AssetRegisterRow,
  AssetValuationSummary,
  DepreciationRunRecord,
  DepreciationScheduleLine,
  RawAsset,
  RawAssetCategory,
  RawAssetDepreciationSummary,
  RawAssetRegisterRow,
  RawAssetValuation,
  RawDepreciationRun,
  RawDepreciationScheduleLine,
} from "@/features/assets/types";

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function decimalString(value: unknown) {
  return sanitizeDecimalInput(typeof value === "string" || typeof value === "number" ? value : 0);
}

function idString(value: unknown) {
  return String(value ?? "");
}

export function adaptAssetCategory(raw: RawAssetCategory): AssetCategory {
  return {
    id: idString(raw.id),
    organizationId: stringOrNull(raw.organization_id ?? raw.organizationId),
    name: typeof raw.name === "string" ? raw.name : "Asset category",
    defaultUsefulLifeMonths: numberOrNull(raw.default_useful_life_months ?? raw.defaultUsefulLifeMonths),
    depreciationMethod: String(raw.depreciation_method ?? raw.depreciationMethod ?? "straight_line"),
    assetAccountId: stringOrNull(raw.asset_account_id ?? raw.assetAccountId),
    accumulatedDepreciationAccountId: stringOrNull(raw.accumulated_depreciation_account_id ?? raw.accumulatedDepreciationAccountId),
    depreciationExpenseAccountId: stringOrNull(raw.depreciation_expense_account_id ?? raw.depreciationExpenseAccountId),
    createdAt: stringOrNull(raw.created_at ?? raw.createdAt),
    updatedAt: stringOrNull(raw.updated_at ?? raw.updatedAt),
  };
}

export function adaptAsset(raw: RawAsset): Asset {
  return {
    id: idString(raw.id),
    organizationId: stringOrNull(raw.organization_id ?? raw.organizationId),
    assetCategoryId: stringOrNull(raw.asset_category_id ?? raw.assetCategoryId),
    assetCategoryName: stringOrNull(raw.asset_category_name ?? raw.assetCategoryName ?? raw.category_name ?? raw.categoryName),
    name: typeof raw.name === "string" ? raw.name : "Fixed asset",
    description: stringOrNull(raw.description),
    acquisitionDate: stringOrNull(raw.acquisition_date ?? raw.acquisitionDate),
    acquisitionCost: decimalString(raw.acquisition_cost ?? raw.acquisitionCost),
    usefulLifeMonths: numberOrNull(raw.useful_life_months ?? raw.usefulLifeMonths),
    depreciationMethod: String(raw.depreciation_method ?? raw.depreciationMethod ?? "straight_line"),
    residualValue: decimalString(raw.residual_value ?? raw.residualValue ?? 0),
    depreciationStartDate: stringOrNull(raw.depreciation_start_date ?? raw.depreciationStartDate),
    accumulatedDepreciation: decimalString(raw.accumulated_depreciation ?? raw.accumulatedDepreciation ?? 0),
    netBookValue: decimalString(raw.net_book_value ?? raw.netBookValue ?? 0),
    status: String(raw.status ?? "active"),
    assetAccountId: stringOrNull(raw.asset_account_id ?? raw.assetAccountId),
    accumulatedDepreciationAccountId: stringOrNull(raw.accumulated_depreciation_account_id ?? raw.accumulatedDepreciationAccountId),
    depreciationExpenseAccountId: stringOrNull(raw.depreciation_expense_account_id ?? raw.depreciationExpenseAccountId),
    disposalDate: stringOrNull(raw.disposal_date ?? raw.disposalDate),
    disposalProceeds: stringOrNull(raw.disposal_proceeds ?? raw.disposalProceeds),
    createdAt: stringOrNull(raw.created_at ?? raw.createdAt),
    updatedAt: stringOrNull(raw.updated_at ?? raw.updatedAt),
  };
}

export function adaptAssetRegisterRow(raw: RawAssetRegisterRow): AssetRegisterRow {
  return {
    id: idString(raw.id ?? raw.asset_id ?? raw.assetId),
    assetId: idString(raw.asset_id ?? raw.assetId ?? raw.id),
    name: typeof raw.name === "string" ? raw.name : "Fixed asset",
    categoryName: stringOrNull(raw.category_name ?? raw.categoryName ?? raw.asset_category_name ?? raw.assetCategoryName),
    acquisitionDate: stringOrNull(raw.acquisition_date ?? raw.acquisitionDate),
    acquisitionCost: decimalString(raw.acquisition_cost ?? raw.acquisitionCost),
    depreciationMethod: String(raw.depreciation_method ?? raw.depreciationMethod ?? "straight_line"),
    usefulLifeMonths: numberOrNull(raw.useful_life_months ?? raw.usefulLifeMonths),
    accumulatedDepreciation: decimalString(raw.accumulated_depreciation ?? raw.accumulatedDepreciation ?? 0),
    netBookValue: decimalString(raw.net_book_value ?? raw.netBookValue ?? 0),
    status: String(raw.status ?? "active"),
  };
}

export function adaptDepreciationScheduleLine(raw: RawDepreciationScheduleLine): DepreciationScheduleLine {
  return {
    id: idString(raw.id ?? raw.period_date ?? raw.periodDate),
    periodDate: stringOrNull(raw.period_date ?? raw.periodDate),
    depreciationAmount: decimalString(raw.depreciation_amount ?? raw.depreciationAmount ?? 0),
    accumulatedDepreciation: decimalString(raw.accumulated_depreciation ?? raw.accumulatedDepreciation ?? 0),
    netBookValue: decimalString(raw.net_book_value ?? raw.netBookValue ?? 0),
    status: String(raw.status ?? "scheduled"),
    postedAt: stringOrNull(raw.posted_at ?? raw.postedAt),
  };
}

export function adaptDepreciationRun(raw: RawDepreciationRun): DepreciationRunRecord {
  return {
    id: idString(raw.id),
    runDate: stringOrNull(raw.run_date ?? raw.runDate),
    throughDate: stringOrNull(raw.through_date ?? raw.throughDate),
    status: String(raw.status ?? "completed"),
    assetCount: numberOrNull(raw.asset_count ?? raw.assetCount),
    totalDepreciation: decimalString(raw.total_depreciation ?? raw.totalDepreciation ?? 0),
    createdAt: stringOrNull(raw.created_at ?? raw.createdAt),
    postedAt: stringOrNull(raw.posted_at ?? raw.postedAt),
  };
}

export function adaptAssetValuationSummary(raw: RawAssetValuation): AssetValuationSummary {
  return {
    totalAssetCost: decimalString(raw.total_asset_cost ?? raw.totalAssetCost ?? raw.total_cost ?? raw.totalCost ?? 0),
    totalAccumulatedDepreciation: decimalString(raw.total_accumulated_depreciation ?? raw.totalAccumulatedDepreciation ?? 0),
    totalNetBookValue: decimalString(raw.total_net_book_value ?? raw.totalNetBookValue ?? 0),
    activeAssetCount: numberOrNull(raw.active_asset_count ?? raw.activeAssetCount) ?? 0,
    disposedAssetCount: numberOrNull(raw.disposed_asset_count ?? raw.disposedAssetCount) ?? 0,
  };
}

export function adaptAssetDepreciationSummary(raw: RawAssetDepreciationSummary): AssetDepreciationSummary {
  return {
    currentPeriodDepreciation: decimalString(raw.current_period_depreciation ?? raw.currentPeriodDepreciation ?? 0),
    yearToDateDepreciation: decimalString(raw.year_to_date_depreciation ?? raw.yearToDateDepreciation ?? 0),
    lifeToDateDepreciation: decimalString(raw.life_to_date_depreciation ?? raw.lifeToDateDepreciation ?? 0),
    lastRunAt: stringOrNull(raw.last_run_at ?? raw.lastRunAt),
  };
}
