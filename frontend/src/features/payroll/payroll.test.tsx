import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PayrollEntryDetailCard } from "@/features/payroll/components/payroll-entry-detail-card";
import { PayrollStatusBadge } from "@/features/payroll/components/payroll-status-badge";
import { employeeFormSchema, payrollPeriodFormSchema, payrollRunFormSchema } from "@/features/payroll/schemas";

describe("payroll form validation", () => {
  it("requires employee identity and start date", () => {
    expect(employeeFormSchema.safeParse({
      first_name: "",
      last_name: "",
      email: "",
      employee_number: "",
      employment_status: "",
      employment_type: "",
      start_date: "",
      end_date: "",
      pay_schedule: "",
      pay_frequency: "",
      default_hours: "abc",
      default_rate: "",
      currency_code: "USD",
      notes: "",
    }).success).toBe(false);
  });

  it("validates payroll period ordering and requires a run period", () => {
    expect(payrollPeriodFormSchema.safeParse({ name: "March", start_date: "2026-03-31", end_date: "2026-03-01", payment_date: "", frequency: "Monthly" }).success).toBe(false);
    expect(payrollRunFormSchema.safeParse({ payroll_period_id: "", name: "", pay_date: "" }).success).toBe(false);
  });
});

describe("payroll UI helpers", () => {
  it("renders payroll status badges and payslip sections", () => {
    render(
      <>
        <PayrollStatusBadge value="calculated" />
        <PayrollEntryDetailCard
          currencyCode="USD"
          entry={{
            id: "entry-1",
            payrollRunId: "run-1",
            employeeId: "employee-1",
            employeeName: "Alex Rivera",
            employmentStatus: "active",
            employmentType: "full_time",
            status: "calculated",
            grossPay: "5000.00",
            deductionsTotal: "1000.00",
            netPay: "4000.00",
            earnings: [{ name: "Base salary", type: "earning", amount: "5000.00" }],
            deductions: [{ name: "Tax", type: "deduction", amount: "1000.00" }],
            employerCosts: [],
            liabilities: [],
            notes: "Reviewed by payroll team.",
            payDate: "2026-03-31",
            createdAt: null,
            updatedAt: null,
          }}
        />
      </>,
    );

    expect(screen.getAllByText(/calculated/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Base salary")).toBeInTheDocument();
    expect(screen.getByText("Reviewed by payroll team.")).toBeInTheDocument();
  });
});
