import { apiClient } from "@/lib/api/client";
import type { BillingPlan, BillingState } from "@/features/billing/types";

export function fetchPublicPlans() {
  return apiClient<BillingPlan[]>("/public/plans", { skipAuth: true });
}

export function fetchBillingState(organizationId: string) {
  return apiClient<BillingState>(`/organizations/${organizationId}/billing/state`);
}

export function changePlan(organizationId: string, payload: { plan_code: string; billing_interval: "monthly" | "yearly"; seats?: number }) {
  return apiClient<BillingState>(`/organizations/${organizationId}/billing/change-plan`, { method: "POST", body: payload });
}

export function updateCancelPolicy(organizationId: string, cancel_at_period_end: boolean) {
  return apiClient<BillingState>(`/organizations/${organizationId}/billing/cancel-policy`, { method: "POST", body: { cancel_at_period_end } });
}
