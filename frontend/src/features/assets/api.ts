import { apiClient } from "@/lib/api/client";

import {
  adaptAsset,
  adaptAssetCategory,
  adaptAssetDepreciationSummary,
  adaptAssetRegisterRow,
  adaptAssetValuationSummary,
  adaptDepreciationRun,
  adaptDepreciationScheduleLine,
} from "@/features/assets/adapters";
import type {
  AssetCategoryMutationPayload,
  AssetDisposalPayload,
  AssetMutationPayload,
  DepreciationRunPayload,
  RawAsset,
  RawAssetCategory,
  RawAssetDepreciationSummary,
  RawAssetRegisterRow,
  RawAssetValuation,
  RawDepreciationRun,
  RawDepreciationScheduleLine,
} from "@/features/assets/types";

function extractItems<T>(response: { items?: T[]; rows?: T[]; data?: T[] } | T[]) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.items ?? response.rows ?? response.data ?? [];
}

export async function listAssetCategories(organizationId: string) {
  const response = await apiClient<{ items?: RawAssetCategory[] } | RawAssetCategory[]>(`/organizations/${organizationId}/asset-categories`);
  return extractItems(response).map(adaptAssetCategory);
}

export async function getAssetCategory(organizationId: string, categoryId: string) {
  const response = await apiClient<RawAssetCategory>(`/organizations/${organizationId}/asset-categories/${categoryId}`);
  return adaptAssetCategory(response);
}

export async function createAssetCategory(organizationId: string, payload: AssetCategoryMutationPayload) {
  const response = await apiClient<RawAssetCategory>(`/organizations/${organizationId}/asset-categories`, {
    method: "POST",
    body: payload,
  });
  return adaptAssetCategory(response);
}

export async function updateAssetCategory(organizationId: string, categoryId: string, payload: Partial<AssetCategoryMutationPayload>) {
  const response = await apiClient<RawAssetCategory>(`/organizations/${organizationId}/asset-categories/${categoryId}`, {
    method: "PATCH",
    body: payload,
  });
  return adaptAssetCategory(response);
}

export async function listAssets(organizationId: string) {
  const response = await apiClient<{ items?: RawAsset[] } | RawAsset[]>(`/organizations/${organizationId}/assets`);
  return extractItems(response).map(adaptAsset);
}

export async function getAsset(organizationId: string, assetId: string) {
  const response = await apiClient<RawAsset>(`/organizations/${organizationId}/assets/${assetId}`);
  return adaptAsset(response);
}

export async function createAsset(organizationId: string, payload: AssetMutationPayload) {
  const response = await apiClient<RawAsset>(`/organizations/${organizationId}/assets`, {
    method: "POST",
    body: payload,
  });
  return adaptAsset(response);
}

export async function updateAsset(organizationId: string, assetId: string, payload: Partial<AssetMutationPayload>) {
  const response = await apiClient<RawAsset>(`/organizations/${organizationId}/assets/${assetId}`, {
    method: "PATCH",
    body: payload,
  });
  return adaptAsset(response);
}

export async function getDepreciationSchedule(organizationId: string, assetId: string) {
  const response = await apiClient<{ items?: RawDepreciationScheduleLine[] } | RawDepreciationScheduleLine[]>(`/organizations/${organizationId}/assets/${assetId}/depreciation-schedule`);
  return extractItems(response).map(adaptDepreciationScheduleLine);
}

export async function generateAssetDepreciation(organizationId: string, assetId: string) {
  const response = await apiClient<RawAsset>(`/organizations/${organizationId}/assets/${assetId}/generate-depreciation`, {
    method: "POST",
  });
  return adaptAsset(response);
}

export async function listDepreciationRuns(organizationId: string) {
  const response = await apiClient<{ items?: RawDepreciationRun[] } | RawDepreciationRun[]>(`/organizations/${organizationId}/depreciation-runs`);
  return extractItems(response).map(adaptDepreciationRun);
}

export async function runDepreciation(organizationId: string, payload: DepreciationRunPayload) {
  const response = await apiClient<RawDepreciationRun>(`/organizations/${organizationId}/depreciation/run`, {
    method: "POST",
    body: payload,
  });
  return adaptDepreciationRun(response);
}

export async function disposeAsset(organizationId: string, assetId: string, payload: AssetDisposalPayload) {
  const response = await apiClient<RawAsset>(`/organizations/${organizationId}/assets/${assetId}/dispose`, {
    method: "POST",
    body: payload,
  });
  return adaptAsset(response);
}

export async function getAssetRegister(organizationId: string) {
  const response = await apiClient<{ items?: RawAssetRegisterRow[]; rows?: RawAssetRegisterRow[] } | RawAssetRegisterRow[]>(`/organizations/${organizationId}/asset-register`);
  return extractItems(response).map(adaptAssetRegisterRow);
}

export async function getAssetValuation(organizationId: string) {
  const response = await apiClient<RawAssetValuation>(`/organizations/${organizationId}/asset-valuation`);
  return adaptAssetValuationSummary(response);
}

export async function getAssetDepreciationSummary(organizationId: string) {
  const response = await apiClient<RawAssetDepreciationSummary>(`/organizations/${organizationId}/asset-depreciation-summary`);
  return adaptAssetDepreciationSummary(response);
}
