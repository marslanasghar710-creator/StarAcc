import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CustomReportListTable } from "@/features/reporting-builder/components/custom-report-list-table";
import { FieldPicker } from "@/features/reporting-builder/components/field-picker";
import { FilterBuilder } from "@/features/reporting-builder/components/filter-builder";
import { GroupingBuilder } from "@/features/reporting-builder/components/grouping-builder";
import { ReportExportActions } from "@/features/reporting-builder/components/report-export-actions";
import { ReportPreviewTable } from "@/features/reporting-builder/components/report-preview-table";
import { SortingBuilder } from "@/features/reporting-builder/components/sorting-builder";
import { customReportDefinitionSchema } from "@/features/reporting-builder/schemas";

describe("custom reporting validation", () => {
  it("requires a dataset and at least one column", () => {
    expect(customReportDefinitionSchema.safeParse({ datasetId: "", columns: [], filters: [], groupings: [], sorting: [] }).success).toBe(false);
  });
});

describe("custom reporting components", () => {
  const fields = [
    { key: "customer_name", label: "Customer", description: null, dataType: "string", kind: "dimension", filterOperators: ["eq", "contains"], sortable: true, groupable: true, aggregations: [], options: [] },
    { key: "amount_due", label: "Amount due", description: null, dataType: "number", kind: "metric", filterOperators: ["eq", "gte"], sortable: true, groupable: false, aggregations: ["sum"], options: [] },
  ] as const;

  it("renders field picker and toggles columns", () => {
    const onToggle = vi.fn();
    render(<FieldPicker fields={fields as never} selected={["customer_name"]} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText(/customer/i));
    expect(onToggle).toHaveBeenCalledWith("customer_name");
  });

  it("renders filter builder rows", () => {
    const onChange = vi.fn();
    render(<FilterBuilder fields={fields as never} filters={[{ field: "customer_name", operator: "contains", value: "Acme" }]} onChange={onChange} />);
    expect(screen.getByDisplayValue("Acme")).toBeInTheDocument();
    expect(screen.getByText(/add filter/i)).toBeInTheDocument();
  });

  it("renders grouping and sorting builders", () => {
    render(
      <>
        <GroupingBuilder fields={fields.filter((field) => field.groupable) as never} groupings={["customer_name"]} onChange={() => {}} />
        <SortingBuilder fields={fields as never} sorting={[{ field: "amount_due", direction: "desc" }]} onChange={() => {}} />
      </>,
    );
    expect(screen.getByText(/grouping/i)).toBeInTheDocument();
    expect(screen.getByText(/sorting/i)).toBeInTheDocument();
  });

  it("renders preview tables with totals", () => {
    render(
      <ReportPreviewTable
        result={{
          reportDefinitionId: null,
          dataset: { id: "invoices", key: "invoices", name: "Invoices", description: null, requiredPermissions: ["invoices.read"], defaultColumns: ["customer_name"] },
          columns: fields as never,
          filters: [],
          filterSummary: [],
          groupings: [],
          sorting: [],
          rows: [{ customer_name: "Acme", amount_due: "250.00" }],
          totals: { amount_due: "250.00" },
          rowCount: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
          validationErrors: [],
          execution: { executionId: null, status: "completed", executedAt: "2026-03-23T00:00:00Z", completedAt: null, requestedByUserId: null, requestedByEmail: null, reportDefinitionId: null },
        }}
      />,
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Totals")).toBeInTheDocument();
  });

  it("shows export actions only when permission allows it", () => {
    const onExport = vi.fn();
    const { rerender } = render(<ReportExportActions canExport={false} onExport={onExport} />);
    expect(screen.queryByText(/export csv/i)).not.toBeInTheDocument();
    rerender(<ReportExportActions canExport onExport={onExport} />);
    fireEvent.click(screen.getByText(/export csv/i));
    expect(onExport).toHaveBeenCalledWith("csv");
  });

  it("renders saved report list with run and edit affordances", () => {
    const onRun = vi.fn();
    render(
      <CustomReportListTable
        reports={[{ id: "r1", organizationId: "org1", name: "A/R by customer", description: "Open receivables", datasetId: "invoices", columns: [], filters: [], groupings: [], sorting: [], displayOptions: null, isSystemTemplate: false, createdByUserId: null, createdByEmail: "owner@example.com", createdAt: "2026-03-20T00:00:00Z", updatedAt: "2026-03-20T00:00:00Z", archivedAt: null, lastRunAt: null, lastRunStatus: null, lastRunByUserId: null, lastRunByEmail: null, visibility: "private", validationErrors: [] }]}
        onRun={onRun}
        onDelete={() => {}}
        canDelete
      />,
    );
    expect(screen.getByText(/a\/r by customer/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/run/i));
    expect(onRun).toHaveBeenCalledWith("r1");
  });
});
