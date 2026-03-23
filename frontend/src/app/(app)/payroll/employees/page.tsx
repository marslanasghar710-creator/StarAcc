"use client";

import * as React from "react";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { PageHeader } from "@/components/layout/page-header";
import { PageActionBar } from "@/components/shared/page-action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmployeeFormDialog } from "@/features/payroll/components/employee-form-dialog";
import { EmployeeListTable } from "@/features/payroll/components/employee-list-table";
import { useCreateEmployee, useEmployees, useUpdateEmployee } from "@/features/payroll/hooks";
import { type EmployeeFormValues } from "@/features/payroll/schemas";
import type { Employee } from "@/features/payroll/types";
import { usePermissions } from "@/features/permissions/hooks";
import { useOrganization } from "@/providers/organization-provider";

function toEmployeePayload(values: EmployeeFormValues) {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    email: values.email || null,
    employee_number: values.employee_number || null,
    employment_status: values.employment_status,
    employment_type: values.employment_type,
    start_date: values.start_date,
    end_date: values.end_date || null,
    pay_schedule: values.pay_schedule || null,
    pay_frequency: values.pay_frequency || null,
    default_hours: values.default_hours || null,
    default_rate: values.default_rate || null,
    currency_code: values.currency_code || null,
    notes: values.notes || null,
  };
}

export default function PayrollEmployeesPage() {
  const { currentOrganizationId, currentOrganization, isLoadingOrganizations } = useOrganization();
  const { can } = usePermissions();
  const canRead = can("payroll.read");
  const canManage = can("employees.manage");
  const [search, setSearch] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);

  const employeesQuery = useEmployees(currentOrganizationId ?? undefined, canRead);
  const createEmployeeMutation = useCreateEmployee(currentOrganizationId ?? undefined);
  const updateEmployeeMutation = useUpdateEmployee(currentOrganizationId ?? undefined, selectedEmployee?.id);

  const filteredEmployees = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const employees = employeesQuery.data ?? [];
    if (!term) return employees;
    return employees.filter((employee) => [employee.displayName, employee.email, employee.employeeNumber, employee.employmentStatus, employee.employmentType].some((value) => value?.toLowerCase().includes(term)));
  }, [employeesQuery.data, search]);

  async function handleCreate(values: EmployeeFormValues) {
    const created = await createEmployeeMutation.mutateAsync(toEmployeePayload(values));
    toast.success(`Created employee ${created.displayName}`);
  }

  async function handleUpdate(values: EmployeeFormValues) {
    const updated = await updateEmployeeMutation.mutateAsync(toEmployeePayload(values));
    toast.success(`Updated employee ${updated.displayName}`);
  }

  function handleOpenCreate() {
    setSelectedEmployee(null);
    setIsDialogOpen(true);
  }

  function handleOpenEdit(employee: Employee) {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  }

  if (isLoadingOrganizations) {
    return <LoadingScreen label="Loading payroll employees" />;
  }

  if (!currentOrganizationId) {
    return <EmptyState title="No organization selected" description="Choose an organization before opening payroll employees." />;
  }

  if (!canRead) {
    return <AccessDeniedState description="You need payroll.read to view payroll employees." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={currentOrganization?.name || "Payroll"}
        title="Payroll employees"
        description="Manage payroll employee master data used by backend payroll calculations and run entry generation."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/payroll"><ArrowLeft className="size-4" />Back to payroll</Link></Button>
            {canManage ? <Button onClick={handleOpenCreate}><Plus className="size-4" />Add employee</Button> : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Total employees</CardTitle>
            <CardDescription>Employees currently returned by the payroll backend.</CardDescription>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold tabular-nums">{employeesQuery.data?.length ?? 0}</p></CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Manage permission</CardTitle>
            <CardDescription>Only roles with employees.manage can create or edit employee records.</CardDescription>
          </CardHeader>
          <CardContent><p className="text-sm">{canManage ? "You can manage payroll employees." : "Your role is view-only for employee master data."}</p></CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Data ownership</CardTitle>
            <CardDescription>Employee records feed backend payroll truth.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Keep employment status, type, dates, and defaults current so payroll runs calculate correctly in backend services.
          </CardContent>
        </Card>
      </div>

      <PageActionBar left={<Input className="max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees by name, email, status, or type" />} right={<p className="text-sm text-muted-foreground">Edit employee master data here; review calculations on payroll run detail pages.</p>} />

      {employeesQuery.isLoading ? <LoadingScreen label="Loading payroll employees" /> : null}
      {employeesQuery.isError ? <ErrorState description="We couldn't load payroll employees." onRetry={() => void employeesQuery.refetch()} /> : null}
      {!employeesQuery.isLoading && !employeesQuery.isError && filteredEmployees.length === 0 ? (
        <EmptyState title={search ? "No matching employees" : "No payroll employees yet"} description={search ? "Try a broader search term." : "Create your first payroll employee to prepare for payroll runs."} action={canManage ? <Button onClick={handleOpenCreate}><Plus className="size-4" />Add employee</Button> : undefined} />
      ) : null}
      {!employeesQuery.isLoading && !employeesQuery.isError && filteredEmployees.length > 0 ? <EmployeeListTable employees={filteredEmployees} onEdit={canManage ? handleOpenEdit : undefined} /> : null}

      <EmployeeFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        employee={selectedEmployee}
        onSubmit={selectedEmployee ? handleUpdate : handleCreate}
        isSubmitting={selectedEmployee ? updateEmployeeMutation.isPending : createEmployeeMutation.isPending}
        defaultCurrencyCode={currentOrganization?.base_currency}
      />
    </div>
  );
}
