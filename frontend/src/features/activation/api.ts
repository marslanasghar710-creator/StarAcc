import { apiClient } from "@/lib/api/client";
import type { ActivationSnapshotResponse } from "@/features/activation/types";

export function getActivationSnapshot(organizationId: string) {
  return apiClient<ActivationSnapshotResponse>(`/organizations/${organizationId}/activation/snapshot`);
}

export function confirmSettingsReviewed(organizationId: string) {
  return apiClient<ActivationSnapshotResponse>(`/organizations/${organizationId}/activation/confirm-settings-reviewed`, { method: "POST", body: { org_id: organizationId } });
}
