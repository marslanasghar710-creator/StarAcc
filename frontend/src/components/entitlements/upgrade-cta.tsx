"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export function UpgradeCTA({ label = "Upgrade", href = "/pricing" }: { label?: string; href?: string }) {
  return <Button asChild size="sm"><Link href={href}>{label}</Link></Button>;
}
