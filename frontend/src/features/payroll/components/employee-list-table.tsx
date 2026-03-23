import type { Employee } from "@/features/payroll/types";
import { DateDisplay } from "@/components/shared/date-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PayrollStatusBadge } from "@/features/payroll/components/payroll-status-badge";

export function EmployeeListTable({ employees, onEdit }: { employees: Employee[]; onEdit?: (employee: Employee) => void; }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Start date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{employee.displayName}</span>
                  <span className="text-xs text-muted-foreground">{employee.email || employee.employeeNumber || "No email or employee number"}</span>
                </div>
              </TableCell>
              <TableCell><PayrollStatusBadge value={employee.employmentStatus} /></TableCell>
              <TableCell><PayrollStatusBadge value={employee.employmentType} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{employee.payFrequency || employee.paySchedule || "—"}</TableCell>
              <TableCell><DateDisplay value={employee.startDate} /></TableCell>
              <TableCell className="text-right">{onEdit ? <Button variant="outline" size="sm" onClick={() => onEdit(employee)}>Edit</Button> : null}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
