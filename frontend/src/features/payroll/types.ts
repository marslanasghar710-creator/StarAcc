export type EmployeeEmploymentStatus = "active" | "inactive" | "terminated" | "on_leave" | string;
export type EmployeeEmploymentType = "full_time" | "part_time" | "contractor" | "casual" | string;
export type PayrollPeriodStatus = "draft" | "open" | "closed" | "processing" | string;
export type PayrollRunStatus = "draft" | "open" | "calculated" | "posted" | "processing" | "failed" | string;
export type PayrollEntryStatus = "draft" | "calculated" | "posted" | "failed" | string;

export type RawEmployee = {
  id: string;
  organization_id?: string;
  organizationId?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  display_name?: string | null;
  displayName?: string | null;
  email?: string | null;
  employee_number?: string | null;
  employeeNumber?: string | null;
  employment_status?: EmployeeEmploymentStatus;
  employmentStatus?: EmployeeEmploymentStatus;
  employment_type?: EmployeeEmploymentType;
  employmentType?: EmployeeEmploymentType;
  start_date?: string | null;
  startDate?: string | null;
  end_date?: string | null;
  endDate?: string | null;
  pay_schedule?: string | null;
  paySchedule?: string | null;
  pay_frequency?: string | null;
  payFrequency?: string | null;
  default_hours?: string | number | null;
  defaultHours?: string | number | null;
  default_rate?: string | number | null;
  defaultRate?: string | number | null;
  currency_code?: string | null;
  currencyCode?: string | null;
  notes?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

export type Employee = {
  id: string;
  organizationId?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email?: string | null;
  employeeNumber?: string | null;
  employmentStatus: EmployeeEmploymentStatus;
  employmentType: EmployeeEmploymentType;
  startDate?: string | null;
  endDate?: string | null;
  paySchedule?: string | null;
  payFrequency?: string | null;
  defaultHours?: string | null;
  defaultRate?: string | null;
  currencyCode?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EmployeeMutationPayload = {
  first_name: string;
  last_name: string;
  email?: string | null;
  employee_number?: string | null;
  employment_status: string;
  employment_type: string;
  start_date?: string | null;
  end_date?: string | null;
  pay_schedule?: string | null;
  pay_frequency?: string | null;
  default_hours?: string | null;
  default_rate?: string | null;
  currency_code?: string | null;
  notes?: string | null;
};

export type RawPayrollPeriod = {
  id: string;
  organization_id?: string;
  organizationId?: string;
  name?: string | null;
  period_name?: string | null;
  periodName?: string | null;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  payment_date?: string | null;
  paymentDate?: string | null;
  status?: PayrollPeriodStatus;
  frequency?: string | null;
  employee_count?: number | null;
  employeeCount?: number | null;
  run_count?: number | null;
  runCount?: number | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

export type PayrollPeriod = {
  id: string;
  organizationId?: string;
  name: string;
  startDate: string;
  endDate: string;
  paymentDate?: string | null;
  status: PayrollPeriodStatus;
  frequency?: string | null;
  employeeCount: number;
  runCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PayrollPeriodMutationPayload = {
  name?: string | null;
  start_date: string;
  end_date: string;
  payment_date?: string | null;
  frequency?: string | null;
};

export type RawPayrollRun = {
  id: string;
  organization_id?: string;
  organizationId?: string;
  payroll_period_id?: string;
  payrollPeriodId?: string;
  period_id?: string;
  periodId?: string;
  name?: string | null;
  run_name?: string | null;
  runName?: string | null;
  status?: PayrollRunStatus;
  pay_date?: string | null;
  payDate?: string | null;
  period_start_date?: string | null;
  periodStartDate?: string | null;
  period_end_date?: string | null;
  periodEndDate?: string | null;
  employee_count?: number | null;
  employeeCount?: number | null;
  total_gross?: string | number | null;
  totalGross?: string | number | null;
  total_deductions?: string | number | null;
  totalDeductions?: string | number | null;
  total_net?: string | number | null;
  totalNet?: string | number | null;
  currency_code?: string | null;
  currencyCode?: string | null;
  calculated_at?: string | null;
  calculatedAt?: string | null;
  posted_at?: string | null;
  postedAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

export type PayrollRun = {
  id: string;
  organizationId?: string;
  payrollPeriodId: string;
  name: string;
  status: PayrollRunStatus;
  payDate?: string | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  employeeCount: number;
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
  currencyCode?: string | null;
  calculatedAt?: string | null;
  postedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PayrollRunMutationPayload = {
  payroll_period_id: string;
  name?: string | null;
  pay_date?: string | null;
};

export type RawPayrollComponentLine = {
  id?: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  type?: string | null;
  category?: string | null;
  amount?: string | number | null;
};

export type PayrollComponentLine = {
  id?: string;
  code?: string | null;
  name: string;
  description?: string | null;
  type: string;
  category?: string | null;
  amount: string;
};

export type RawPayrollEntry = {
  id: string;
  payroll_run_id?: string;
  payrollRunId?: string;
  employee_id?: string;
  employeeId?: string;
  employee_name?: string | null;
  employeeName?: string | null;
  employment_status?: string | null;
  employmentStatus?: string | null;
  employment_type?: string | null;
  employmentType?: string | null;
  status?: PayrollEntryStatus;
  gross_pay?: string | number | null;
  grossPay?: string | number | null;
  total_gross?: string | number | null;
  totalGross?: string | number | null;
  deductions_total?: string | number | null;
  deductionsTotal?: string | number | null;
  total_deductions?: string | number | null;
  totalDeductions?: string | number | null;
  net_pay?: string | number | null;
  netPay?: string | number | null;
  total_net?: string | number | null;
  totalNet?: string | number | null;
  earnings?: RawPayrollComponentLine[] | null;
  deductions?: RawPayrollComponentLine[] | null;
  employer_costs?: RawPayrollComponentLine[] | null;
  liabilities?: RawPayrollComponentLine[] | null;
  notes?: string | null;
  pay_date?: string | null;
  payDate?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

export type PayrollEntry = {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employmentStatus?: string | null;
  employmentType?: string | null;
  status: PayrollEntryStatus;
  grossPay: string;
  deductionsTotal: string;
  netPay: string;
  earnings: PayrollComponentLine[];
  deductions: PayrollComponentLine[];
  employerCosts: PayrollComponentLine[];
  liabilities: PayrollComponentLine[];
  notes?: string | null;
  payDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RawPayrollSummary = {
  total_gross?: string | number | null;
  totalGross?: string | number | null;
  total_deductions?: string | number | null;
  totalDeductions?: string | number | null;
  total_net?: string | number | null;
  totalNet?: string | number | null;
  active_employees?: number | null;
  activeEmployees?: number | null;
  payroll_runs?: number | null;
  payrollRuns?: number | null;
  last_posted_run_id?: string | null;
  lastPostedRunId?: string | null;
  last_pay_date?: string | null;
  lastPayDate?: string | null;
  currency_code?: string | null;
  currencyCode?: string | null;
};

export type PayrollSummary = {
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
  activeEmployees: number;
  payrollRuns: number;
  lastPostedRunId?: string | null;
  lastPayDate?: string | null;
  currencyCode?: string | null;
};

export type RawPayrollLiability = {
  id?: string;
  code?: string | null;
  name?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
  amount_due?: string | number | null;
  amountDue?: string | number | null;
  status?: string | null;
};

export type PayrollLiability = {
  id: string;
  code?: string | null;
  name: string;
  dueDate?: string | null;
  amountDue: string;
  status: string;
};
