"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { addBillItem, approveBill, createBill, deleteBill, deleteBillItem, getBill, getBillAttachments, linkBillFile, listBills, listOpenBills, listOverdueBills, listStoredFiles, postBill, searchBills, updateBillHeader, updateBillItem, voidBill } from "@/features/bills/api";
import type { BillHeaderUpdatePayload, BillMutationPayload } from "@/features/bills/types";

export function useBills(organizationId?: string, search?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.bills.list(organizationId, search ?? "") : ["bills", "missing", "list"],
    queryFn: () => (search ? searchBills(organizationId as string, search) : listBills(organizationId as string)),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useOpenBills(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.bills.open(organizationId) : ["bills", "missing", "open"],
    queryFn: () => listOpenBills(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useOverdueBills(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.bills.overdue(organizationId) : ["bills", "missing", "overdue"],
    queryFn: () => listOverdueBills(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useBill(organizationId?: string, billId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && billId ? queryKeys.bills.detail(organizationId, billId) : ["bills", "missing", "detail"],
    queryFn: () => getBill(organizationId as string, billId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(billId),
  });
}


export function useBillAvailableFiles(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? ["files", organizationId, "list"] : ["files", "missing", "list"],
    queryFn: () => listStoredFiles(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}
export function useBillAttachments(organizationId?: string, billId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && billId ? queryKeys.bills.attachments(organizationId, billId) : ["bills", "missing", "attachments"],
    queryFn: () => getBillAttachments(organizationId as string, billId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(billId),
  });
}

function invalidateBill(queryClient: ReturnType<typeof useQueryClient>, organizationId: string, billId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.bills.root(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.bills.detail(organizationId, billId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.bills.attachments(organizationId, billId) }),
  ]);
}

export function useCreateBill(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BillMutationPayload) => createBill(organizationId as string, payload),
    onSuccess: async (bill) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.bills.detail(organizationId, bill.id), bill);
      await queryClient.invalidateQueries({ queryKey: queryKeys.bills.root(organizationId) });
    },
  });
}

export function useUpdateBill(organizationId?: string, billId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BillHeaderUpdatePayload) => updateBillHeader(organizationId as string, billId as string, payload),
    onSuccess: async () => {
      if (!organizationId || !billId) return;
      await invalidateBill(queryClient, organizationId, billId);
    },
  });
}

export function useDeleteBill(organizationId?: string, billId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteBill(organizationId as string, billId as string),
    onSuccess: async () => {
      if (!organizationId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.bills.root(organizationId) });
    },
  });
}

export function useApproveBill(organizationId?: string, billId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveBill(organizationId as string, billId as string),
    onSuccess: async () => {
      if (!organizationId || !billId) return;
      await invalidateBill(queryClient, organizationId, billId);
    },
  });
}

export function usePostBill(organizationId?: string, billId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postBill(organizationId as string, billId as string),
    onSuccess: async () => {
      if (!organizationId || !billId) return;
      await invalidateBill(queryClient, organizationId, billId);
    },
  });
}

export function useVoidBill(organizationId?: string, billId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => voidBill(organizationId as string, billId as string, reason),
    onSuccess: async () => {
      if (!organizationId || !billId) return;
      await invalidateBill(queryClient, organizationId, billId);
    },
  });
}

export function useAddBillItem(organizationId?: string, billId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => addBillItem(organizationId as string, billId as string, payload),
    onSuccess: async () => {
      if (!organizationId || !billId) return;
      await invalidateBill(queryClient, organizationId, billId);
    },
  });
}

export function useUpdateBillItem(organizationId?: string, billId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: Record<string, unknown> }) => updateBillItem(organizationId as string, billId as string, itemId, payload),
    onSuccess: async () => {
      if (!organizationId || !billId) return;
      await invalidateBill(queryClient, organizationId, billId);
    },
  });
}

export function useDeleteBillItem(organizationId?: string, billId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteBillItem(organizationId as string, billId as string, itemId),
    onSuccess: async () => {
      if (!organizationId || !billId) return;
      await invalidateBill(queryClient, organizationId, billId);
    },
  });
}

export function useLinkBillFile(organizationId?: string, billId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, label }: { fileId: string; label?: string }) => linkBillFile(organizationId as string, billId as string, fileId, label),
    onSuccess: async () => {
      if (!organizationId || !billId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.bills.attachments(organizationId, billId) });
    },
  });
}
