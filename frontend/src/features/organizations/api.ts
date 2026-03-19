import { apiClient } from "@/lib/api/client";

export type OrganizationSummary = {
  id: string;
  name: string;
  base_currency: string;
  timezone: string;
};

export async function listOrganizations() {
  return apiClient<OrganizationSummary[]>("/organizations");
}
