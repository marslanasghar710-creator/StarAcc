"use client";

import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({ isLoading, children, ...props }: ButtonProps & { isLoading?: boolean }) {
  return (
    <Button disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
