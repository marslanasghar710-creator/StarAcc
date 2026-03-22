"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import {
  createAsset,
  createAssetCategory,
  deleteAssetCategory,
  disposeAsset,
  generateAssetDepreciation,
  getAsset,
  getAssetDepreciationSummary,
  getAssetRegister,
  getAssetValuation,
  getDepreciationSchedule,
  listAssetCategories,
  listAssets,
  listDepreciationRuns,
  runDepreciation,
  updateAsset,
  updateAssetCategory,
} from "@/features/assets/api";
import type { AssetCategoryMutationPayload, AssetDisposalPayload, AssetMutationPayload, DepreciationRunPayload } from "@/features/assets/types";

export function useAssets(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.assets.list(organizationId) : ["assets", "missing", "list"],
    queryFn: () => listAssets(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useAsset(organizationId?: string, assetId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && assetId ? queryKeys.assets.detail(organizationId, assetId) : ["assets", "missing", "detail"],
    queryFn: () => getAsset(organizationId as string, assetId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(assetId),
  });
}

export function useCreateAsset(organizationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssetMutationPayload) => createAsset(organizationId as string, payload),
    onSuccess: async (asset) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.assets.detail(organizationId, asset.id), asset);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.register(organizationId) }),
      ]);
    },
  });
}

export function useUpdateAsset(organizationId?: string, assetId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<AssetMutationPayload>) => updateAsset(organizationId as string, assetId as string, payload),
    onSuccess: async (asset) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.assets.detail(organizationId, asset.id), asset);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.detail(organizationId, asset.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.register(organizationId) }),
      ]);
    },
  });
}

export function useAssetCategories(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.assets.categories(organizationId) : ["assets", "missing", "categories"],
    queryFn: () => listAssetCategories(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useCreateAssetCategory(organizationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssetCategoryMutationPayload) => createAssetCategory(organizationId as string, payload),
    onSuccess: async (category) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.assets.category(organizationId, category.id), category);
      await queryClient.invalidateQueries({ queryKey: queryKeys.assets.categories(organizationId) });
    },
  });
}

export function useUpdateAssetCategory(organizationId?: string, categoryId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<AssetCategoryMutationPayload>) => updateAssetCategory(organizationId as string, categoryId as string, payload),
    onSuccess: async (category) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.assets.category(organizationId, category.id), category);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.categories(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.root(organizationId) }),
      ]);
    },
  });
}

export function useDeleteAssetCategory(organizationId?: string, categoryId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAssetCategory(organizationId as string, categoryId as string),
    onSuccess: async () => {
      if (!organizationId || !categoryId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.categories(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.category(organizationId, categoryId) }),
      ]);
    },
  });
}

export function useDepreciationSchedule(organizationId?: string, assetId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && assetId ? queryKeys.assets.depreciationSchedule(organizationId, assetId) : ["assets", "missing", "depreciation-schedule"],
    queryFn: () => getDepreciationSchedule(organizationId as string, assetId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(assetId),
  });
}

export function useGenerateAssetDepreciation(organizationId?: string, assetId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateAssetDepreciation(organizationId as string, assetId as string),
    onSuccess: async (asset) => {
      if (!organizationId || !assetId) return;
      queryClient.setQueryData(queryKeys.assets.detail(organizationId, asset.id), asset);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.detail(organizationId, asset.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.depreciationSchedule(organizationId, assetId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.valuation(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.depreciationSummary(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.depreciationRuns(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.register(organizationId) }),
      ]);
    },
  });
}

export function useDepreciationRuns(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.assets.depreciationRuns(organizationId) : ["assets", "missing", "depreciation-runs"],
    queryFn: () => listDepreciationRuns(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useRunDepreciation(organizationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DepreciationRunPayload) => runDepreciation(organizationId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.depreciationRuns(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.valuation(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.depreciationSummary(organizationId) }),
      ]);
    },
  });
}

export function useDisposeAsset(organizationId?: string, assetId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssetDisposalPayload) => disposeAsset(organizationId as string, assetId as string, payload),
    onSuccess: async (asset) => {
      if (!organizationId || !assetId) return;
      queryClient.setQueryData(queryKeys.assets.detail(organizationId, asset.id), asset);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.detail(organizationId, asset.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.register(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.valuation(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.depreciationSummary(organizationId) }),
      ]);
    },
  });
}

export function useAssetRegister(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.assets.register(organizationId) : ["assets", "missing", "register"],
    queryFn: () => getAssetRegister(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useAssetValuation(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.assets.valuation(organizationId) : ["assets", "missing", "valuation"],
    queryFn: () => getAssetValuation(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useAssetDepreciationSummary(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.assets.depreciationSummary(organizationId) : ["assets", "missing", "depreciation-summary"],
    queryFn: () => getAssetDepreciationSummary(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}
