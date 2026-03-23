"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/features/api/query-keys";
import {
  calculatePayrollRun,
  createEmployee,
  createPayrollPeriod,
  createPayrollRun,
  getEmployee,
  getPayrollEntry,
  getPayrollRun,
  getPayrollSummary,
  listEmployees,
  listPayrollLiabilities,
  listPayrollPeriods,
  listPayrollRunEntries,
  listPayrollRuns,
  postPayrollRun,
  updateEmployee,
} from "@/features/payroll/api";
import type { EmployeeMutationPayload, PayrollPeriodMutationPayload, PayrollRunMutationPayload } from "@/features/payroll/types";

function invalidatePayrollRoot(queryClient: ReturnType<typeof useQueryClient>, organizationId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.payroll.root(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.payroll.employeesRoot(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.payroll.periodsRoot(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.payroll.runsRoot(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.payroll.summary(organizationId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.payroll.liabilities(organizationId) }),
  ]);
}

export function useEmployees(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.payroll.employees(organizationId) : ["payroll", "employees", "missing"],
    queryFn: () => listEmployees(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useEmployee(organizationId?: string, employeeId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && employeeId ? queryKeys.payroll.employee(organizationId, employeeId) : ["payroll", "employee", "missing"],
    queryFn: () => getEmployee(organizationId as string, employeeId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(employeeId),
  });
}

export function useCreateEmployee(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmployeeMutationPayload) => createEmployee(organizationId as string, payload),
    onSuccess: async (employee) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.payroll.employee(organizationId, employee.id), employee);
      await invalidatePayrollRoot(queryClient, organizationId);
    },
  });
}

export function useUpdateEmployee(organizationId?: string, employeeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<EmployeeMutationPayload>) => updateEmployee(organizationId as string, employeeId as string, payload),
    onSuccess: async (employee) => {
      if (!organizationId || !employeeId) return;
      queryClient.setQueryData(queryKeys.payroll.employee(organizationId, employeeId), employee);
      await invalidatePayrollRoot(queryClient, organizationId);
    },
  });
}

export function usePayrollPeriods(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.payroll.periods(organizationId) : ["payroll", "periods", "missing"],
    queryFn: () => listPayrollPeriods(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useCreatePayrollPeriod(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PayrollPeriodMutationPayload) => createPayrollPeriod(organizationId as string, payload),
    onSuccess: async () => {
      if (!organizationId) return;
      await invalidatePayrollRoot(queryClient, organizationId);
    },
  });
}

export function usePayrollRuns(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.payroll.runs(organizationId) : ["payroll", "runs", "missing"],
    queryFn: () => listPayrollRuns(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function usePayrollRun(organizationId?: string, runId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && runId ? queryKeys.payroll.run(organizationId, runId) : ["payroll", "run", "missing"],
    queryFn: () => getPayrollRun(organizationId as string, runId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(runId),
  });
}

export function useCreatePayrollRun(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PayrollRunMutationPayload) => createPayrollRun(organizationId as string, payload),
    onSuccess: async (run) => {
      if (!organizationId) return;
      queryClient.setQueryData(queryKeys.payroll.run(organizationId, run.id), run);
      await invalidatePayrollRoot(queryClient, organizationId);
    },
  });
}

export function useCalculatePayrollRun(organizationId?: string, runId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => calculatePayrollRun(organizationId as string, runId as string),
    onSuccess: async (run) => {
      if (!organizationId || !runId) return;
      queryClient.setQueryData(queryKeys.payroll.run(organizationId, runId), run);
      await invalidatePayrollRoot(queryClient, organizationId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.payroll.entries(organizationId, runId) });
    },
  });
}

export function usePostPayrollRun(organizationId?: string, runId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postPayrollRun(organizationId as string, runId as string),
    onSuccess: async (run) => {
      if (!organizationId || !runId) return;
      queryClient.setQueryData(queryKeys.payroll.run(organizationId, runId), run);
      await invalidatePayrollRoot(queryClient, organizationId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.payroll.entries(organizationId, runId) });
    },
  });
}

export function usePayrollRunEntries(organizationId?: string, runId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && runId ? queryKeys.payroll.entries(organizationId, runId) : ["payroll", "entries", "missing"],
    queryFn: () => listPayrollRunEntries(organizationId as string, runId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(runId),
  });
}

export function usePayrollEntry(organizationId?: string, entryId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId && entryId ? queryKeys.payroll.entry(organizationId, entryId) : ["payroll", "entry", "missing"],
    queryFn: () => getPayrollEntry(organizationId as string, entryId as string),
    enabled: enabled && Boolean(organizationId) && Boolean(entryId),
  });
}

export function usePayrollSummary(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.payroll.summary(organizationId) : ["payroll", "summary", "missing"],
    queryFn: () => getPayrollSummary(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}

export function usePayrollLiabilities(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: organizationId ? queryKeys.payroll.liabilities(organizationId) : ["payroll", "liabilities", "missing"],
    queryFn: () => listPayrollLiabilities(organizationId as string),
    enabled: enabled && Boolean(organizationId),
  });
}
