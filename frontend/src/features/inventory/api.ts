import { apiClient } from "@/lib/api/client";

import {
  adaptInventoryAdjustment,
  adaptInventoryBalance,
  adaptInventoryItem,
  adaptInventoryLocation,
  adaptInventoryMovement,
  adaptInventoryValuation,
} from "@/features/inventory/adapters";
import type {
  InventoryAdjustmentMutationPayload,
  InventoryItemMutationPayload,
  RawInventoryAdjustment,
  RawInventoryBalance,
  RawInventoryItem,
  RawInventoryLocation,
  RawInventoryMovement,
  RawInventoryValuation,
} from "@/features/inventory/types";

export async function listItems(organizationId: string, search?: string) {
  const path = search?.trim()
    ? `/organizations/${organizationId}/items/search?q=${encodeURIComponent(search.trim())}`
    : `/organizations/${organizationId}/items`;
  const response = await apiClient<{ items: RawInventoryItem[] }>(path);
  return response.items.map(adaptInventoryItem);
}

export async function getItem(organizationId: string, itemId: string) {
  const response = await apiClient<RawInventoryItem>(`/organizations/${organizationId}/items/${itemId}`);
  return adaptInventoryItem(response);
}

export async function createItem(organizationId: string, payload: InventoryItemMutationPayload) {
  const { is_active, ...createPayload } = payload;
  const response = await apiClient<RawInventoryItem>(`/organizations/${organizationId}/items`, {
    method: "POST",
    body: createPayload,
  });
  const created = adaptInventoryItem(response);

  if (typeof is_active === "boolean" && is_active !== created.isActive) {
    return updateItem(organizationId, created.id, { is_active });
  }

  return created;
}

export async function updateItem(organizationId: string, itemId: string, payload: Partial<InventoryItemMutationPayload>) {
  const response = await apiClient<RawInventoryItem>(`/organizations/${organizationId}/items/${itemId}`, {
    method: "PATCH",
    body: payload,
  });
  return adaptInventoryItem(response);
}

export async function listInventoryBalances(organizationId: string) {
  const response = await apiClient<{ items: RawInventoryBalance[] }>(`/organizations/${organizationId}/inventory/balances`);
  return response.items.map(adaptInventoryBalance);
}

export async function getInventoryItemBalance(organizationId: string, itemId: string) {
  const response = await apiClient<RawInventoryBalance>(`/organizations/${organizationId}/inventory/items/${itemId}/balance`);
  return adaptInventoryBalance(response);
}

export async function listInventoryItemMovements(organizationId: string, itemId: string) {
  const response = await apiClient<{ items: RawInventoryMovement[] }>(`/organizations/${organizationId}/inventory/items/${itemId}/movements`);
  return response.items.map(adaptInventoryMovement);
}

export async function listInventoryAdjustments(organizationId: string) {
  const response = await apiClient<{ items: RawInventoryAdjustment[] }>(`/organizations/${organizationId}/inventory/adjustments`);
  return response.items.map(adaptInventoryAdjustment);
}

export async function createInventoryAdjustment(organizationId: string, payload: InventoryAdjustmentMutationPayload) {
  const response = await apiClient<RawInventoryAdjustment>(`/organizations/${organizationId}/inventory/adjustments`, {
    method: "POST",
    body: payload,
  });
  return adaptInventoryAdjustment(response);
}

export async function getInventoryValuation(organizationId: string) {
  const response = await apiClient<RawInventoryValuation>(`/organizations/${organizationId}/inventory/valuation`);
  return adaptInventoryValuation(response);
}

export async function listInventoryLocations(organizationId: string) {
  const response = await apiClient<{ items: RawInventoryLocation[] }>(`/organizations/${organizationId}/inventory/locations`);
  return response.items.map(adaptInventoryLocation);
}
