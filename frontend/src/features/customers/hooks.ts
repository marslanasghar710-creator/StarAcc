"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { archiveCustomer, createCustomer, getCustomer, getCustomerActivity, getCustomerBalance, listCustomers, searchCustomers, updateCustomer } from "@/features/customers/api";
import type { CustomerMutationPayload } from "@/features/customers/types";

export function useCustomers(organizationId?: string, search?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.customers.list(organizationId, search ?? "") : ["customers", "missing", "list"],
    queryFn: () => (search ? searchCustomers(organizationId as string, search) : listCustomers(organizationId as string)),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useCustomer(organizationId?: string, customerId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && customerId ? queryKeys.customers.detail(organizationId, customerId) : ["customers", "missing", "detail"],
    queryFn: () => getCustomer(organizationId as string, customerId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(customerId),
  });
}

export function useCustomerBalance(organizationId?: string, customerId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && customerId ? queryKeys.customers.balance(organizationId, customerId) : ["customers", "missing", "balance"],
    queryFn: () => getCustomerBalance(organizationId as string, customerId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(customerId),
  });
}

export function useCustomerActivity(organizationId?: string, customerId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && customerId ? queryKeys.customers.activity(organizationId, customerId) : ["customers", "missing", "activity"],
    queryFn: () => getCustomerActivity(organizationId as string, customerId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(customerId),
  });
}

export function useCreateCustomer(organizationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerMutationPayload) => createCustomer(organizationId as string, payload),
    onSuccess: async (customer) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.customers.detail(organizationId, customer.id), customer);
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.root(organizationId) });
    },
  });
}

export function useUpdateCustomer(organizationId?: string, customerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<CustomerMutationPayload>) => updateCustomer(organizationId as string, customerId as string, payload),
    onSuccess: async (customer) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.customers.detail(organizationId, customer.id), customer);
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.root(organizationId) });
    },
  });
}

export function useArchiveCustomer(organizationId?: string, customerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => archiveCustomer(organizationId as string, customerId as string),
    onSuccess: async () => {
      if (!organizationId || !customerId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(organizationId, customerId) }),
      ]);
    },
  });
}
