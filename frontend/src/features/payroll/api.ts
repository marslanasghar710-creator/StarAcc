import { sanitizeDecimalInput } from "@/lib/accounting/decimal";
import { apiClient } from "@/lib/api/client";

import type {
  Employee,
  EmployeeMutationPayload,
  PayrollComponentLine,
  PayrollEntry,
  PayrollLiability,
  PayrollPeriod,
  PayrollPeriodMutationPayload,
  PayrollRun,
  PayrollRunMutationPayload,
  PayrollSummary,
  RawEmployee,
  RawPayrollComponentLine,
  RawPayrollEntry,
  RawPayrollLiability,
  RawPayrollPeriod,
  RawPayrollRun,
  RawPayrollSummary,
} from "@/features/payroll/types";

function adaptComponentLine(raw: RawPayrollComponentLine, index: number): PayrollComponentLine {
  return {
    id: raw.id,
    code: raw.code ?? null,
    name: raw.name ?? raw.description ?? `Line ${index + 1}`,
    description: raw.description ?? null,
    type: raw.type ?? "line",
    category: raw.category ?? null,
    amount: sanitizeDecimalInput(raw.amount ?? 0),
  };
}

function adaptEmployee(raw: RawEmployee): Employee {
  const firstName = raw.first_name ?? raw.firstName ?? "";
  const lastName = raw.last_name ?? raw.lastName ?? "";
  const derivedName = [firstName, lastName].filter(Boolean).join(" ");
  const displayName = raw.display_name ?? raw.displayName ?? (derivedName || raw.email || "Unnamed employee");

  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    firstName,
    lastName,
    displayName,
    email: raw.email ?? null,
    employeeNumber: raw.employee_number ?? raw.employeeNumber ?? null,
    employmentStatus: raw.employment_status ?? raw.employmentStatus ?? "active",
    employmentType: raw.employment_type ?? raw.employmentType ?? "full_time",
    startDate: raw.start_date ?? raw.startDate ?? null,
    endDate: raw.end_date ?? raw.endDate ?? null,
    paySchedule: raw.pay_schedule ?? raw.paySchedule ?? null,
    payFrequency: raw.pay_frequency ?? raw.payFrequency ?? null,
    defaultHours: raw.default_hours != null || raw.defaultHours != null ? sanitizeDecimalInput(raw.default_hours ?? raw.defaultHours ?? 0) : null,
    defaultRate: raw.default_rate != null || raw.defaultRate != null ? sanitizeDecimalInput(raw.default_rate ?? raw.defaultRate ?? 0) : null,
    currencyCode: raw.currency_code ?? raw.currencyCode ?? null,
    notes: raw.notes ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
  };
}

function adaptPayrollPeriod(raw: RawPayrollPeriod): PayrollPeriod {
  const startDate = raw.start_date ?? raw.startDate ?? "";
  const endDate = raw.end_date ?? raw.endDate ?? "";
  const fallbackName = startDate && endDate ? `${startDate} to ${endDate}` : raw.id;

  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    name: raw.name ?? raw.period_name ?? raw.periodName ?? fallbackName,
    startDate,
    endDate,
    paymentDate: raw.payment_date ?? raw.paymentDate ?? null,
    status: raw.status ?? "draft",
    frequency: raw.frequency ?? null,
    employeeCount: raw.employee_count ?? raw.employeeCount ?? 0,
    runCount: raw.run_count ?? raw.runCount ?? 0,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
  };
}

function adaptPayrollRun(raw: RawPayrollRun): PayrollRun {
  const payrollPeriodId = raw.payroll_period_id ?? raw.payrollPeriodId ?? raw.period_id ?? raw.periodId ?? "";
  const periodStartDate = raw.period_start_date ?? raw.periodStartDate ?? null;
  const periodEndDate = raw.period_end_date ?? raw.periodEndDate ?? null;

  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    payrollPeriodId,
    name: raw.name ?? raw.run_name ?? raw.runName ?? `Payroll run ${raw.id}`,
    status: raw.status ?? "draft",
    payDate: raw.pay_date ?? raw.payDate ?? null,
    periodStartDate,
    periodEndDate,
    employeeCount: raw.employee_count ?? raw.employeeCount ?? 0,
    totalGross: sanitizeDecimalInput(raw.total_gross ?? raw.totalGross ?? 0),
    totalDeductions: sanitizeDecimalInput(raw.total_deductions ?? raw.totalDeductions ?? 0),
    totalNet: sanitizeDecimalInput(raw.total_net ?? raw.totalNet ?? 0),
    currencyCode: raw.currency_code ?? raw.currencyCode ?? null,
    calculatedAt: raw.calculated_at ?? raw.calculatedAt ?? null,
    postedAt: raw.posted_at ?? raw.postedAt ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
  };
}

function adaptPayrollEntry(raw: RawPayrollEntry): PayrollEntry {
  return {
    id: raw.id,
    payrollRunId: raw.payroll_run_id ?? raw.payrollRunId ?? "",
    employeeId: raw.employee_id ?? raw.employeeId ?? "",
    employeeName: raw.employee_name ?? raw.employeeName ?? "Unknown employee",
    employmentStatus: raw.employment_status ?? raw.employmentStatus ?? null,
    employmentType: raw.employment_type ?? raw.employmentType ?? null,
    status: raw.status ?? "draft",
    grossPay: sanitizeDecimalInput(raw.gross_pay ?? raw.grossPay ?? raw.total_gross ?? raw.totalGross ?? 0),
    deductionsTotal: sanitizeDecimalInput(raw.deductions_total ?? raw.deductionsTotal ?? raw.total_deductions ?? raw.totalDeductions ?? 0),
    netPay: sanitizeDecimalInput(raw.net_pay ?? raw.netPay ?? raw.total_net ?? raw.totalNet ?? 0),
    earnings: (raw.earnings ?? []).map(adaptComponentLine),
    deductions: (raw.deductions ?? []).map(adaptComponentLine),
    employerCosts: (raw.employer_costs ?? []).map(adaptComponentLine),
    liabilities: (raw.liabilities ?? []).map(adaptComponentLine),
    notes: raw.notes ?? null,
    payDate: raw.pay_date ?? raw.payDate ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
  };
}

function adaptPayrollSummary(raw: RawPayrollSummary): PayrollSummary {
  return {
    totalGross: sanitizeDecimalInput(raw.total_gross ?? raw.totalGross ?? 0),
    totalDeductions: sanitizeDecimalInput(raw.total_deductions ?? raw.totalDeductions ?? 0),
    totalNet: sanitizeDecimalInput(raw.total_net ?? raw.totalNet ?? 0),
    activeEmployees: raw.active_employees ?? raw.activeEmployees ?? 0,
    payrollRuns: raw.payroll_runs ?? raw.payrollRuns ?? 0,
    lastPostedRunId: raw.last_posted_run_id ?? raw.lastPostedRunId ?? null,
    lastPayDate: raw.last_pay_date ?? raw.lastPayDate ?? null,
    currencyCode: raw.currency_code ?? raw.currencyCode ?? null,
  };
}

function adaptPayrollLiability(raw: RawPayrollLiability, index: number): PayrollLiability {
  return {
    id: String(raw.id ?? raw.code ?? raw.name ?? index),
    code: raw.code ?? null,
    name: raw.name ?? raw.code ?? `Liability ${index + 1}`,
    dueDate: raw.due_date ?? raw.dueDate ?? null,
    amountDue: sanitizeDecimalInput(raw.amount_due ?? raw.amountDue ?? 0),
    status: raw.status ?? "open",
  };
}

export async function listEmployees(organizationId: string) {
  const response = await apiClient<RawEmployee[] | { items: RawEmployee[] }>(`/organizations/${organizationId}/employees`);
  const items = Array.isArray(response) ? response : response.items;
  return items.map(adaptEmployee);
}

export async function getEmployee(organizationId: string, employeeId: string) {
  const response = await apiClient<RawEmployee>(`/organizations/${organizationId}/employees/${employeeId}`);
  return adaptEmployee(response);
}

export async function createEmployee(organizationId: string, payload: EmployeeMutationPayload) {
  const response = await apiClient<RawEmployee>(`/organizations/${organizationId}/employees`, { method: "POST", body: payload });
  return adaptEmployee(response);
}

export async function updateEmployee(organizationId: string, employeeId: string, payload: Partial<EmployeeMutationPayload>) {
  const response = await apiClient<RawEmployee>(`/organizations/${organizationId}/employees/${employeeId}`, { method: "PATCH", body: payload });
  return adaptEmployee(response);
}

export async function deleteEmployee(organizationId: string, employeeId: string) {
  return apiClient<void>(`/organizations/${organizationId}/employees/${employeeId}`, { method: "DELETE" });
}

export async function listPayrollPeriods(organizationId: string) {
  const response = await apiClient<RawPayrollPeriod[] | { items: RawPayrollPeriod[] }>(`/organizations/${organizationId}/payroll-periods`);
  const items = Array.isArray(response) ? response : response.items;
  return items.map(adaptPayrollPeriod);
}

export async function createPayrollPeriod(organizationId: string, payload: PayrollPeriodMutationPayload) {
  const response = await apiClient<RawPayrollPeriod>(`/organizations/${organizationId}/payroll-periods`, { method: "POST", body: payload });
  return adaptPayrollPeriod(response);
}

export async function listPayrollRuns(organizationId: string) {
  const response = await apiClient<RawPayrollRun[] | { items: RawPayrollRun[] }>(`/organizations/${organizationId}/payroll-runs`);
  const items = Array.isArray(response) ? response : response.items;
  return items.map(adaptPayrollRun);
}

export async function getPayrollRun(organizationId: string, runId: string) {
  const response = await apiClient<RawPayrollRun>(`/organizations/${organizationId}/payroll-runs/${runId}`);
  return adaptPayrollRun(response);
}

export async function createPayrollRun(organizationId: string, payload: PayrollRunMutationPayload) {
  const response = await apiClient<RawPayrollRun>(`/organizations/${organizationId}/payroll-runs`, { method: "POST", body: payload });
  return adaptPayrollRun(response);
}

export async function calculatePayrollRun(organizationId: string, runId: string) {
  const response = await apiClient<RawPayrollRun>(`/organizations/${organizationId}/payroll-runs/${runId}/calculate`, { method: "POST" });
  return adaptPayrollRun(response);
}

export async function postPayrollRun(organizationId: string, runId: string) {
  const response = await apiClient<RawPayrollRun>(`/organizations/${organizationId}/payroll-runs/${runId}/post`, { method: "POST" });
  return adaptPayrollRun(response);
}

export async function listPayrollRunEntries(organizationId: string, runId: string) {
  const response = await apiClient<RawPayrollEntry[] | { items: RawPayrollEntry[] }>(`/organizations/${organizationId}/payroll-runs/${runId}/entries`);
  const items = Array.isArray(response) ? response : response.items;
  return items.map(adaptPayrollEntry);
}

export async function getPayrollEntry(organizationId: string, entryId: string) {
  const response = await apiClient<RawPayrollEntry>(`/organizations/${organizationId}/payroll-entries/${entryId}`);
  return adaptPayrollEntry(response);
}

export async function getPayrollSummary(organizationId: string) {
  const response = await apiClient<RawPayrollSummary>(`/organizations/${organizationId}/payroll-summary`);
  return adaptPayrollSummary(response);
}

export async function listPayrollLiabilities(organizationId: string) {
  const response = await apiClient<RawPayrollLiability[] | { items: RawPayrollLiability[] }>(`/organizations/${organizationId}/payroll-liabilities`);
  const items = Array.isArray(response) ? response : response.items;
  return items.map(adaptPayrollLiability);
}
