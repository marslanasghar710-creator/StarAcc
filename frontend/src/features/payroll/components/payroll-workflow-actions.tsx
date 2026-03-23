"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PayrollRun } from "@/features/payroll/types";

export function PayrollWorkflowActions({ run, canCalculate, canPost, onCalculate, onPost, isCalculating, isPosting }: { run: PayrollRun; canCalculate: boolean; canPost: boolean; onCalculate: () => Promise<void>; onPost: () => Promise<void>; isCalculating?: boolean; isPosting?: boolean; }) {
  const [confirmAction, setConfirmAction] = React.useState<"calculate" | "post" | null>(null);

  async function handleConfirm() {
    if (confirmAction === "calculate") {
      await onCalculate();
    }
    if (confirmAction === "post") {
      await onPost();
    }
    setConfirmAction(null);
  }

  return (
    <>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Workflow actions</CardTitle>
          <CardDescription>Guard calculate and post actions because payroll truth remains backend-owned.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" variant="outline" disabled={!canCalculate || isCalculating} onClick={() => setConfirmAction("calculate")}>{isCalculating ? "Calculating…" : "Calculate payroll"}</Button>
          <Button className="w-full" disabled={!canPost || isPosting} onClick={() => setConfirmAction("post")}>{isPosting ? "Posting…" : "Post payroll"}</Button>
          <div className="rounded-lg border border-border/60 p-3 text-sm text-muted-foreground">
            <p>Current status: <span className="font-medium text-foreground capitalize">{run.status.replaceAll("_", " ")}</span>.</p>
            <p>Calculation populates gross, deductions, liabilities, and net pay from backend services. Posting finalizes journals and downstream liabilities.</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction === "calculate" ? "Calculate payroll run" : "Post payroll run"}</DialogTitle>
            <DialogDescription>
              {confirmAction === "calculate"
                ? "This will ask the backend to calculate the payroll run. The frontend will not compute gross-to-net values itself."
                : "This will ask the backend to post the payroll run and finalize payroll accounting outputs."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border/60 p-3 text-sm text-muted-foreground">
            Please confirm you want to {confirmAction} <span className="font-medium text-foreground">{run.name}</span> for the selected payroll period.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button type="button" onClick={() => void handleConfirm()}>{confirmAction === "calculate" ? "Confirm calculate" : "Confirm post"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
