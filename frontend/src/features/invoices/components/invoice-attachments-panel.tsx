"use client";

import * as React from "react";

import { InlineValidationMessage } from "@/components/shared/inline-validation-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InvoiceAttachment, StoredFile } from "@/features/invoices/types";

export function InvoiceAttachmentsPanel({
  attachments,
  availableFiles,
  canLink,
  onLink,
  isLinking,
  canReadFiles,
}: {
  attachments: InvoiceAttachment[];
  availableFiles: StoredFile[];
  canLink: boolean;
  onLink: (fileId: string, label?: string) => Promise<void>;
  isLinking?: boolean;
  canReadFiles: boolean;
}) {
  const [selectedFileId, setSelectedFileId] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function handleLink() {
    if (!selectedFileId) {
      setError("Select a file to link.");
      return;
    }
    setError(null);
    await onLink(selectedFileId, label || undefined);
    setSelectedFileId("");
    setLabel("");
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Attachments</CardTitle>
        <CardDescription>Linked supporting documents for this invoice.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canReadFiles ? <p className="text-sm text-muted-foreground">You need files.read to view invoice attachments.</p> : null}
        {canReadFiles && attachments.length === 0 ? <p className="text-sm text-muted-foreground">No files are currently linked to this invoice.</p> : null}
        {canReadFiles && attachments.length > 0 ? (
          <ul className="space-y-3">
            {attachments.map((attachment) => (
              <li key={attachment.link.id} className="rounded-lg border border-border/70 p-3 text-sm">
                <div className="font-medium">{attachment.file?.originalFileName || attachment.link.fileId}</div>
                <div className="text-muted-foreground">{attachment.link.label || attachment.file?.mimeType || "Linked file"}</div>
              </li>
            ))}
          </ul>
        ) : null}
        {canReadFiles && canLink ? (
          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <InlineValidationMessage message={error} />
            <Select value={selectedFileId} onValueChange={setSelectedFileId}>
              <SelectTrigger><SelectValue placeholder="Select existing file" /></SelectTrigger>
              <SelectContent>
                {availableFiles.map((file) => (
                  <SelectItem key={file.id} value={file.id}>{file.originalFileName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Optional label" />
            <Button type="button" variant="outline" onClick={() => void handleLink()} disabled={isLinking}>{isLinking ? "Linking…" : "Link file"}</Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
