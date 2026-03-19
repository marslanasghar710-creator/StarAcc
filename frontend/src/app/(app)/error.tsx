"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function AppError() {
  return <ErrorState title="Something went wrong" description="This workspace area hit an unexpected error. Real recovery behavior will be expanded in later prompts." />;
}
