"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import { getOnboardingStatus, resumeOnboarding, selectOnboardingPath, selectOnboardingPersona, updateOnboardingTask } from "@/features/onboarding/api";
import type { OnboardingPath, OnboardingPersona, OnboardingTaskStatus } from "@/features/onboarding/types";

export function useOnboardingStatus(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.onboarding.status(organizationId) : ["onboarding", "missing"],
    queryFn: () => getOnboardingStatus(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useOnboardingMutations(organizationId?: string) {
  const qc = useQueryClient();

  const invalidate = async () => {
    if (!organizationId) return;
    await qc.invalidateQueries({ queryKey: queryKeys.onboarding.status(organizationId) });
  };

  const pathMutation = useMutation({ mutationFn: (path: OnboardingPath) => selectOnboardingPath(organizationId as string, path), onSuccess: invalidate });
  const personaMutation = useMutation({ mutationFn: (persona: OnboardingPersona) => selectOnboardingPersona(organizationId as string, persona), onSuccess: invalidate });
  const taskMutation = useMutation({ mutationFn: ({ taskKey, status }: { taskKey: string; status: OnboardingTaskStatus }) => updateOnboardingTask(organizationId as string, taskKey, status), onSuccess: invalidate });
  const resumeMutation = useMutation({ mutationFn: (source?: string) => resumeOnboarding(organizationId as string, source) });

  return { pathMutation, personaMutation, taskMutation, resumeMutation };
}
