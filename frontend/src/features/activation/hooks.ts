"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getActivationSnapshot, confirmSettingsReviewed } from "@/features/activation/api";

export function useActivationSnapshot(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? ["activation", organizationId, "snapshot"] : ["activation", "missing"],
    queryFn: () => getActivationSnapshot(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useConfirmSettingsReviewed(organizationId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => confirmSettingsReviewed(organizationId as string),
    onSuccess: async () => {
      if (!organizationId) return;
      await qc.invalidateQueries({ queryKey: ["activation", organizationId, "snapshot"] });
    },
  });
}
