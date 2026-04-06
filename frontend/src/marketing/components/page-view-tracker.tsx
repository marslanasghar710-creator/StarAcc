"use client";

import { useEffect } from "react";

import { trackPublicEvent, type PublicEventName } from "@/marketing/lib/analytics";

export function PageViewTracker({ event, payload }: { event: PublicEventName; payload?: Record<string, unknown> }) {
  useEffect(() => {
    trackPublicEvent(event, payload);
  }, [event, payload]);

  return null;
}
