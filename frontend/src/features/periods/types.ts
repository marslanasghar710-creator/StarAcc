export type PeriodStatus = "open" | "closed" | "locked";

export type RawPeriod = {
  id: string;
  organization_id?: string;
  organizationId?: string;
  name: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  fiscal_year?: number;
  fiscalYear?: number;
  period_number?: number;
  periodNumber?: number;
  status: PeriodStatus;
};

export type Period = {
  id: string;
  organizationId?: string;
  name: string;
  startDate: string;
  endDate: string;
  fiscalYear?: number;
  periodNumber?: number;
  status: PeriodStatus;
};
