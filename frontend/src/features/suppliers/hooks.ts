"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { archiveSupplier, createSupplier, getSupplier, getSupplierActivity, getSupplierBalance, listSuppliers, searchSuppliers, updateSupplier } from "@/features/suppliers/api";
import type { SupplierMutationPayload } from "@/features/suppliers/types";

export function useSuppliers(organizationId?: string, search?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.suppliers.list(organizationId, search ?? "") : ["suppliers", "missing", "list"],
    queryFn: () => (search ? searchSuppliers(organizationId as string, search) : listSuppliers(organizationId as string)),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useSupplier(organizationId?: string, supplierId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && supplierId ? queryKeys.suppliers.detail(organizationId, supplierId) : ["suppliers", "missing", "detail"],
    queryFn: () => getSupplier(organizationId as string, supplierId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(supplierId),
  });
}

export function useSupplierBalance(organizationId?: string, supplierId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && supplierId ? queryKeys.suppliers.balance(organizationId, supplierId) : ["suppliers", "missing", "balance"],
    queryFn: () => getSupplierBalance(organizationId as string, supplierId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(supplierId),
  });
}

export function useSupplierActivity(organizationId?: string, supplierId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && supplierId ? queryKeys.suppliers.activity(organizationId, supplierId) : ["suppliers", "missing", "activity"],
    queryFn: () => getSupplierActivity(organizationId as string, supplierId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(supplierId),
  });
}

export function useCreateSupplier(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SupplierMutationPayload) => createSupplier(organizationId as string, payload),
    onSuccess: async (supplier) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.suppliers.detail(organizationId, supplier.id), supplier);
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.root(organizationId) });
    },
  });
}

export function useUpdateSupplier(organizationId?: string, supplierId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<SupplierMutationPayload>) => updateSupplier(organizationId as string, supplierId as string, payload),
    onSuccess: async (supplier) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.suppliers.detail(organizationId, supplier.id), supplier);
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.root(organizationId) });
    },
  });
}

export function useArchiveSupplier(organizationId?: string, supplierId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveSupplier(organizationId as string, supplierId as string),
    onSuccess: async () => {
      if (!organizationId || !supplierId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(organizationId, supplierId) }),
      ]);
    },
  });
}
