import { DateDisplay } from "@/components/shared/date-display";
import { EntitySummaryCard } from "@/components/shared/entity-summary-card";
import { BankImportStatusBadge } from "@/features/banking/components/bank-import-status-badge";
import type { BankImport } from "@/features/banking/types";

export function BankImportDetailCard({ bankImport }: { bankImport: BankImport }) {
  return (
    <EntitySummaryCard
      title="Import run"
      description="Backend-reported bank statement import metadata and stats."
      rows={[
        { label: "File", value: bankImport.fileName || "—" },
        { label: "Status", value: <BankImportStatusBadge status={bankImport.status} /> },
        { label: "Bank account", value: bankImport.bankAccountName || bankImport.bankAccountId || "—" },
        { label: "Source", value: bankImport.source || "—" },
        { label: "Imported at", value: <DateDisplay value={bankImport.importedAt} includeTime /> },
        { label: "Total lines", value: bankImport.totalLines ?? "—" },
        { label: "Imported lines", value: bankImport.importedLines ?? "—" },
        { label: "Duplicate lines", value: bankImport.duplicateLines ?? "—" },
        { label: "Failed lines", value: bankImport.failedLines ?? "—" },
        { label: "Notes", value: bankImport.notes || "—" },
      ]}
    />
  );
}
