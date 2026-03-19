"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { addInvoiceItem, approveInvoice, createInvoice, deleteInvoice, deleteInvoiceItem, getInvoice, getInvoiceAttachments, linkInvoiceFile, listInvoices, listOpenInvoices, listOverdueInvoices, postInvoice, searchInvoices, sendInvoice, sendInvoiceEmail, updateInvoiceHeader, updateInvoiceItem, voidInvoice } from "@/features/invoices/api";
import type { InvoiceHeaderUpdatePayload, InvoiceMutationPayload } from "@/features/invoices/types";

export function useInvoices(organizationId?: string, search?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.invoices.list(organizationId, search ?? "") : ["invoices", "missing", "list"],
    queryFn: () => (search ? searchInvoices(organizationId as string, search) : listInvoices(organizationId as string)),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useOpenInvoices(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.invoices.open(organizationId) : ["invoices", "missing", "open"],
    queryFn: () => listOpenInvoices(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useOverdueInvoices(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.invoices.overdue(organizationId) : ["invoices", "missing", "overdue"],
    queryFn: () => listOverdueInvoices(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useInvoice(organizationId?: string, invoiceId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && invoiceId ? queryKeys.invoices.detail(organizationId, invoiceId) : ["invoices", "missing", "detail"],
    queryFn: () => getInvoice(organizationId as string, invoiceId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(invoiceId),
  });
}

export function useInvoiceAttachments(organizationId?: string, invoiceId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && invoiceId ? queryKeys.invoices.attachments(organizationId, invoiceId) : ["invoices", "missing", "attachments"],
    queryFn: () => getInvoiceAttachments(organizationId as string, invoiceId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(invoiceId),
  });
}

function invalidateInvoice(queryClient: ReturnType<typeof useQueryClient>, organizationId: string, invoiceId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.root(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(organizationId, invoiceId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.attachments(organizationId, invoiceId) }),
  ]);
}

export function useCreateInvoice(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoiceMutationPayload) => createInvoice(organizationId as string, payload),
    onSuccess: async (invoice) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.invoices.detail(organizationId, invoice.id), invoice);
      await queryClient.invalidateQueries({ queryKey: queryKeys.invoices.root(organizationId) });
    },
  });
}

export function useUpdateInvoice(organizationId?: string, invoiceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoiceHeaderUpdatePayload) => updateInvoiceHeader(organizationId as string, invoiceId as string, payload),
    onSuccess: async () => {
      if (!organizationId || !invoiceId) return;
      await invalidateInvoice(queryClient, organizationId, invoiceId);
    },
  });
}

export function useDeleteInvoice(organizationId?: string, invoiceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteInvoice(organizationId as string, invoiceId as string),
    onSuccess: async () => {
      if (!organizationId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.invoices.root(organizationId) });
    },
  });
}

export function useApproveInvoice(organizationId?: string, invoiceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveInvoice(organizationId as string, invoiceId as string),
    onSuccess: async () => {
      if (!organizationId || !invoiceId) return;
      await invalidateInvoice(queryClient, organizationId, invoiceId);
    },
  });
}

export function useSendInvoice(organizationId?: string, invoiceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: "send" | "send-email" = "send") => mode === "send-email" ? sendInvoiceEmail(organizationId as string, invoiceId as string) : sendInvoice(organizationId as string, invoiceId as string),
    onSuccess: async () => {
      if (!organizationId || !invoiceId) return;
      await invalidateInvoice(queryClient, organizationId, invoiceId);
    },
  });
}

export function usePostInvoice(organizationId?: string, invoiceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postInvoice(organizationId as string, invoiceId as string),
    onSuccess: async () => {
      if (!organizationId || !invoiceId) return;
      await invalidateInvoice(queryClient, organizationId, invoiceId);
    },
  });
}

export function useVoidInvoice(organizationId?: string, invoiceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => voidInvoice(organizationId as string, invoiceId as string, reason),
    onSuccess: async () => {
      if (!organizationId || !invoiceId) return;
      await invalidateInvoice(queryClient, organizationId, invoiceId);
    },
  });
}

export function useAddInvoiceItem(organizationId?: string, invoiceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => addInvoiceItem(organizationId as string, invoiceId as string, payload),
    onSuccess: async () => {
      if (!organizationId || !invoiceId) return;
      await invalidateInvoice(queryClient, organizationId, invoiceId);
    },
  });
}

export function useUpdateInvoiceItem(organizationId?: string, invoiceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: Record<string, unknown> }) => updateInvoiceItem(organizationId as string, invoiceId as string, itemId, payload),
    onSuccess: async () => {
      if (!organizationId || !invoiceId) return;
      await invalidateInvoice(queryClient, organizationId, invoiceId);
    },
  });
}

export function useDeleteInvoiceItem(organizationId?: string, invoiceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteInvoiceItem(organizationId as string, invoiceId as string, itemId),
    onSuccess: async () => {
      if (!organizationId || !invoiceId) return;
      await invalidateInvoice(queryClient, organizationId, invoiceId);
    },
  });
}

export function useLinkInvoiceFile(organizationId?: string, invoiceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, label }: { fileId: string; label?: string }) => linkInvoiceFile(organizationId as string, invoiceId as string, fileId, label),
    onSuccess: async () => {
      if (!organizationId || !invoiceId) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.invoices.attachments(organizationId, invoiceId) });
    },
  });
}
