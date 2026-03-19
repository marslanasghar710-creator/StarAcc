import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AccessDeniedState({ title = "Access denied", description = "Your current role does not include permission to view this area.", showDashboardLink = true }: { title?: string; description?: string; showDashboardLink?: boolean }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-5" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {showDashboardLink ? (
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
