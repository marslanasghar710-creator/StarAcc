import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { changePlan, fetchBillingState, fetchPublicPlans, updateCancelPolicy } from "@/features/billing/api";

export function usePublicPlans() {
  return useQuery({ queryKey: queryKeys.billing.publicPlans, queryFn: fetchPublicPlans });
}

export function useBillingState(organizationId?: string) {
  return useQuery({
    queryKey: organizationId ? queryKeys.billing.state(organizationId) : ["billing", "missing", "state"],
    queryFn: () => fetchBillingState(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useChangePlan(organizationId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { plan_code: string; billing_interval: "monthly" | "yearly"; seats?: number }) => changePlan(organizationId!, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await qc.invalidateQueries({ queryKey: queryKeys.billing.state(organizationId) });
    },
  });
}

export function useUpdateCancelPolicy(organizationId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cancelAtPeriodEnd: boolean) => updateCancelPolicy(organizationId!, cancelAtPeriodEnd),
    onSuccess: async () => {
      if (!organizationId) return;
      await qc.invalidateQueries({ queryKey: queryKeys.billing.state(organizationId) });
    },
  });
}
