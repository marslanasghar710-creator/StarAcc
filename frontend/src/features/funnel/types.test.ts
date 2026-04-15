import { describe, expect, it } from "vitest";

import { CANONICAL_FUNNEL_STAGES, EVENT_VERSIONS } from "@/features/funnel/types";

describe("funnel analytics contracts", () => {
  it("keeps canonical funnel stages stable", () => {
    expect(CANONICAL_FUNNEL_STAGES).toEqual([
      "acquired",
      "engaged",
      "demo_entered",
      "signup_started",
      "authenticated",
      "workspace_started",
      "workspace_created",
      "activation_started",
      "activated",
      "handoff_to_app",
    ]);
  });

  it("tracks core conversion and activation lifecycle events", () => {
    const requiredEvents = [
      "marketing.landing.viewed",
      "demo.workspace.entered",
      "auth.signup.started",
      "auth.signup.completed",
      "auth.login.completed",
      "workspace.creation.started",
      "workspace.creation.completed",
      "activation.flow.entered",
      "activation.completed",
      "app.handoff.completed",
    ] as const;

    for (const eventName of requiredEvents) {
      expect(EVENT_VERSIONS[eventName]).toBeTypeOf("number");
      expect(EVENT_VERSIONS[eventName]).toBeGreaterThan(0);
    }
  });
});
