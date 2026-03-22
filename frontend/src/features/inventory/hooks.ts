"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import {
  createInventoryAdjustment,
  createItem,
  getInventoryItemBalance,
  getInventoryValuation,
  getItem,
  listInventoryAdjustments,
  listInventoryBalances,
  listInventoryItemMovements,
  listInventoryLocations,
  listItems,
  updateItem,
} from "@/features/inventory/api";
import type { InventoryAdjustmentMutationPayload, InventoryItemMutationPayload } from "@/features/inventory/types";

export function useItems(organizationId?: string, search?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.inventory.items(organizationId, search ?? "") : ["inventory", "missing", "items"],
    queryFn: () => listItems(organizationId as string, search),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useItem(organizationId?: string, itemId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && itemId ? queryKeys.inventory.item(organizationId, itemId) : ["inventory", "missing", "item"],
    queryFn: () => getItem(organizationId as string, itemId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(itemId),
  });
}

export function useCreateItem(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InventoryItemMutationPayload) => createItem(organizationId as string, payload),
    onSuccess: async (item) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.inventory.item(organizationId, item.id), item);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.items(organizationId, "") }),
      ]);
    },
  });
}

export function useUpdateItem(organizationId?: string, itemId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<InventoryItemMutationPayload>) => updateItem(organizationId as string, itemId as string, payload),
    onSuccess: async (item) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.inventory.item(organizationId, item.id), item);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.item(organizationId, item.id) }),
      ]);
    },
  });
}

export function useInventoryBalances(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.inventory.balances(organizationId) : ["inventory", "missing", "balances"],
    queryFn: () => listInventoryBalances(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useInventoryItemBalance(organizationId?: string, itemId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && itemId ? queryKeys.inventory.balance(organizationId, itemId) : ["inventory", "missing", "balance"],
    queryFn: () => getInventoryItemBalance(organizationId as string, itemId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(itemId),
  });
}

export function useInventoryItemMovements(organizationId?: string, itemId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && itemId ? queryKeys.inventory.movements(organizationId, itemId) : ["inventory", "missing", "movements"],
    queryFn: () => listInventoryItemMovements(organizationId as string, itemId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(itemId),
  });
}

export function useInventoryAdjustments(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.inventory.adjustments(organizationId) : ["inventory", "missing", "adjustments"],
    queryFn: () => listInventoryAdjustments(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useCreateInventoryAdjustment(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InventoryAdjustmentMutationPayload) => createInventoryAdjustment(organizationId as string, payload),
    onSuccess: async (adjustment) => {
      if (!organizationId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.adjustments(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.balances(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.valuation(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.balance(organizationId, adjustment.itemId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movements(organizationId, adjustment.itemId) }),
      ]);
    },
  });
}

export function useInventoryValuation(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.inventory.valuation(organizationId) : ["inventory", "missing", "valuation"],
    queryFn: () => getInventoryValuation(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useInventoryLocations(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.inventory.locations(organizationId) : ["inventory", "missing", "locations"],
    queryFn: () => listInventoryLocations(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}
