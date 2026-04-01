import { apiClient } from "@/lib/api/client";
import type { OnboardingPath, OnboardingPersona, OnboardingResumeResponse, OnboardingStatus, OnboardingTaskStatus } from "@/features/onboarding/types";

export function getOnboardingStatus(organizationId: string) {
  return apiClient<OnboardingStatus>(`/organizations/${organizationId}/onboarding/status`);
}

export function selectOnboardingPath(organizationId: string, path: OnboardingPath) {
  return apiClient<OnboardingStatus>(`/organizations/${organizationId}/onboarding/path`, { method: "POST", body: { path } });
}

export function selectOnboardingPersona(organizationId: string, persona: OnboardingPersona) {
  return apiClient<OnboardingStatus>(`/organizations/${organizationId}/onboarding/persona`, { method: "POST", body: { persona } });
}

export function updateOnboardingTask(organizationId: string, taskKey: string, status: OnboardingTaskStatus) {
  return apiClient<OnboardingStatus>(`/organizations/${organizationId}/onboarding/tasks/${taskKey}`, { method: "POST", body: { status } });
}

export function resumeOnboarding(organizationId: string, source?: string) {
  return apiClient<OnboardingResumeResponse>(`/organizations/${organizationId}/onboarding/resume`, { method: "POST", body: { source } });
}
