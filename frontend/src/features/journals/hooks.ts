"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { createJournal, getJournal, listJournals, postJournal, reverseJournal, searchJournals, updateJournal, voidJournal } from "@/features/journals/api";
import type { JournalMutationPayload, JournalReversePayload } from "@/features/journals/types";

export function useJournals(organizationId?: string, search?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.journals.list(organizationId, search ?? "") : ["journals", "missing", "list"],
    queryFn: () => (search ? searchJournals(organizationId as string, search) : listJournals(organizationId as string)),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useJournal(organizationId?: string, journalId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && journalId ? queryKeys.journals.detail(organizationId, journalId) : ["journals", "missing", "detail"],
    queryFn: () => getJournal(organizationId as string, journalId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(journalId),
  });
}

export function useCreateJournal(organizationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: JournalMutationPayload) => createJournal(organizationId as string, payload),
    onSuccess: async (journal) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(queryKeys.journals.detail(organizationId, journal.id), journal);
      await queryClient.invalidateQueries({ queryKey: queryKeys.journals.root(organizationId) });
    },
  });
}

export function useUpdateJournal(organizationId?: string, journalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: JournalMutationPayload) => updateJournal(organizationId as string, journalId as string, payload),
    onSuccess: async (journal) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(queryKeys.journals.detail(organizationId, journal.id), journal);
      await queryClient.invalidateQueries({ queryKey: queryKeys.journals.root(organizationId) });
    },
  });
}

export function usePostJournal(organizationId?: string, journalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postJournal(organizationId as string, journalId as string),
    onSuccess: async () => {
      if (!organizationId || !journalId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.journals.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.journals.detail(organizationId, journalId) }),
      ]);
    },
  });
}

export function useReverseJournal(organizationId?: string, journalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: JournalReversePayload) => reverseJournal(organizationId as string, journalId as string, payload),
    onSuccess: async () => {
      if (!organizationId || !journalId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.journals.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.journals.detail(organizationId, journalId) }),
      ]);
    },
  });
}

export function useVoidJournal(organizationId?: string, journalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => voidJournal(organizationId as string, journalId as string, reason),
    onSuccess: async () => {
      if (!organizationId || !journalId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.journals.root(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.journals.detail(organizationId, journalId) }),
      ]);
    },
  });
}
