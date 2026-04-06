"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { trackPublicEvent } from "@/marketing/lib/analytics";

export function TrackedLink({ event = "cta_clicked", eventPayload, onClick, ...props }: ComponentProps<typeof Link> & { event?: "cta_clicked" | "feature_viewed"; eventPayload?: Record<string, unknown> }) {
  return (
    <Link
      {...props}
      onClick={(clickEvent) => {
        trackPublicEvent(event, eventPayload ?? { href: props.href.toString() });
        onClick?.(clickEvent);
      }}
    />
  );
}
