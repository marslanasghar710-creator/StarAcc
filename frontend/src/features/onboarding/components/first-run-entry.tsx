"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingMutations } from "@/features/onboarding/hooks";

type Props = {
  organizationId: string;
  onContinue?: () => void;
};

export function FirstRunEntry({ organizationId, onContinue }: Props) {
  const { pathMutation } = useOnboardingMutations(organizationId);

  const choosePath = (path: "explore_demo" | "setup_real" | "expert_skip") => {
    pathMutation.mutate(path, { onSuccess: () => onContinue?.() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start here: Demo or real setup</CardTitle>
        <CardDescription>
          Demo lets you explore safely with seeded data. Real setup configures your own books and readiness checklist.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={() => choosePath("explore_demo")}>Explore demo company</Button>
        <Button variant="secondary" onClick={() => choosePath("setup_real")}>Set up my company</Button>
        <Button variant="ghost" onClick={() => choosePath("expert_skip")}>I already know what I&apos;m doing</Button>
      </CardContent>
    </Card>
  );
}
