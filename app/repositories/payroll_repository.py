from datetime import datetime, timezone

from sqlalchemy import delete, func, select

from app.core.enums import EmployeeStatus, PayrollRunStatus
from sqlalchemy.orm import Session

from app.db.models import (
    Employee,
    PayrollDeductionType,
    PayrollEarningType,
    PayrollEntry,
    PayrollLineItem,
    PayrollPeriod,
    PayrollRun,
)

UTC = timezone.utc


class PayrollRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_employee(self, **kwargs):
        row = Employee(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_employee(self, organization_id, employee_id):
        return self.db.scalar(
            select(Employee).where(
                Employee.organization_id == organization_id,
                Employee.id == employee_id,
                Employee.deleted_at.is_(None),
            )
        )

    def get_employee_by_email(self, organization_id, email: str):
        return self.db.scalar(
            select(Employee).where(
                Employee.organization_id == organization_id,
                Employee.email == email.lower(),
                Employee.deleted_at.is_(None),
            )
        )

    def list_employees(self, organization_id, status=None):
        query = select(Employee).where(Employee.organization_id == organization_id, Employee.deleted_at.is_(None))
        if status:
            query = query.where(Employee.status == status)
        return list(self.db.scalars(query.order_by(Employee.last_name, Employee.first_name)).all())

    def count_active_employees(self, organization_id) -> int:
        return int(
            self.db.scalar(
                select(func.count(Employee.id)).where(
                    Employee.organization_id == organization_id,
                    Employee.status == EmployeeStatus.ACTIVE,
                    Employee.deleted_at.is_(None),
                )
            )
            or 0
        )

    def active_employees_for_period(self, organization_id, period_start, period_end):
        return list(
            self.db.scalars(
                select(Employee).where(
                    Employee.organization_id == organization_id,
                    Employee.status == EmployeeStatus.ACTIVE,
                    Employee.start_date <= period_end,
                    (Employee.end_date.is_(None) | (Employee.end_date >= period_start)),
                    Employee.deleted_at.is_(None),
                ).order_by(Employee.last_name, Employee.first_name)
            ).all()
        )

    def create_earning_type(self, **kwargs):
        row = PayrollEarningType(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_earning_type(self, organization_id, earning_type_id):
        return self.db.scalar(
            select(PayrollEarningType).where(
                PayrollEarningType.organization_id == organization_id,
                PayrollEarningType.id == earning_type_id,
                PayrollEarningType.deleted_at.is_(None),
            )
        )

    def get_earning_type_by_code(self, organization_id, code):
        return self.db.scalar(
            select(PayrollEarningType).where(
                PayrollEarningType.organization_id == organization_id,
                PayrollEarningType.code == code,
                PayrollEarningType.deleted_at.is_(None),
            )
        )

    def list_earning_types(self, organization_id):
        return list(
            self.db.scalars(
                select(PayrollEarningType).where(
                    PayrollEarningType.organization_id == organization_id,
                    PayrollEarningType.deleted_at.is_(None),
                ).order_by(PayrollEarningType.name)
            ).all()
        )

    def create_deduction_type(self, **kwargs):
        row = PayrollDeductionType(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_deduction_type(self, organization_id, deduction_type_id):
        return self.db.scalar(
            select(PayrollDeductionType).where(
                PayrollDeductionType.organization_id == organization_id,
                PayrollDeductionType.id == deduction_type_id,
                PayrollDeductionType.deleted_at.is_(None),
            )
        )

    def get_deduction_type_by_code(self, organization_id, code):
        return self.db.scalar(
            select(PayrollDeductionType).where(
                PayrollDeductionType.organization_id == organization_id,
                PayrollDeductionType.code == code,
                PayrollDeductionType.deleted_at.is_(None),
            )
        )

    def list_deduction_types(self, organization_id):
        return list(
            self.db.scalars(
                select(PayrollDeductionType).where(
                    PayrollDeductionType.organization_id == organization_id,
                    PayrollDeductionType.deleted_at.is_(None),
                ).order_by(PayrollDeductionType.name)
            ).all()
        )

    def create_period(self, **kwargs):
        row = PayrollPeriod(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_period(self, organization_id, period_id):
        return self.db.scalar(
            select(PayrollPeriod).where(
                PayrollPeriod.organization_id == organization_id,
                PayrollPeriod.id == period_id,
                PayrollPeriod.deleted_at.is_(None),
            )
        )

    def list_periods(self, organization_id):
        return list(
            self.db.scalars(
                select(PayrollPeriod).where(
                    PayrollPeriod.organization_id == organization_id,
                    PayrollPeriod.deleted_at.is_(None),
                ).order_by(PayrollPeriod.start_date.desc())
            ).all()
        )

    def find_period_by_dates(self, organization_id, start_date, end_date):
        return self.db.scalar(
            select(PayrollPeriod).where(
                PayrollPeriod.organization_id == organization_id,
                PayrollPeriod.start_date == start_date,
                PayrollPeriod.end_date == end_date,
                PayrollPeriod.deleted_at.is_(None),
            )
        )

    def create_run(self, **kwargs):
        row = PayrollRun(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_run(self, organization_id, run_id):
        return self.db.scalar(
            select(PayrollRun).where(
                PayrollRun.organization_id == organization_id,
                PayrollRun.id == run_id,
                PayrollRun.deleted_at.is_(None),
            )
        )

    def get_run_by_period(self, organization_id, payroll_period_id):
        return self.db.scalar(
            select(PayrollRun).where(
                PayrollRun.organization_id == organization_id,
                PayrollRun.payroll_period_id == payroll_period_id,
                PayrollRun.deleted_at.is_(None),
            )
        )

    def list_runs(self, organization_id):
        return list(
            self.db.scalars(
                select(PayrollRun).where(
                    PayrollRun.organization_id == organization_id,
                    PayrollRun.deleted_at.is_(None),
                ).order_by(PayrollRun.created_at.desc())
            ).all()
        )

    def create_entry(self, **kwargs):
        row = PayrollEntry(created_at=datetime.now(UTC), **kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def list_entries(self, organization_id, payroll_run_id):
        return list(
            self.db.scalars(
                select(PayrollEntry).where(
                    PayrollEntry.organization_id == organization_id,
                    PayrollEntry.payroll_run_id == payroll_run_id,
                ).order_by(PayrollEntry.created_at, PayrollEntry.employee_id)
            ).all()
        )

    def get_entry(self, organization_id, entry_id):
        return self.db.scalar(
            select(PayrollEntry).where(
                PayrollEntry.organization_id == organization_id,
                PayrollEntry.id == entry_id,
            )
        )

    def create_line_item(self, **kwargs):
        row = PayrollLineItem(created_at=datetime.now(UTC), **kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def list_line_items(self, organization_id, payroll_entry_id):
        return list(
            self.db.scalars(
                select(PayrollLineItem).where(
                    PayrollLineItem.organization_id == organization_id,
                    PayrollLineItem.payroll_entry_id == payroll_entry_id,
                ).order_by(PayrollLineItem.created_at, PayrollLineItem.name)
            ).all()
        )

    def delete_entries_for_run(self, organization_id, payroll_run_id):
        entry_ids = list(
            self.db.scalars(
                select(PayrollEntry.id).where(
                    PayrollEntry.organization_id == organization_id,
                    PayrollEntry.payroll_run_id == payroll_run_id,
                )
            ).all()
        )
        if entry_ids:
            self.db.execute(delete(PayrollLineItem).where(PayrollLineItem.organization_id == organization_id, PayrollLineItem.payroll_entry_id.in_(entry_ids)))
        self.db.execute(delete(PayrollEntry).where(PayrollEntry.organization_id == organization_id, PayrollEntry.payroll_run_id == payroll_run_id))
        self.db.flush()

    def payroll_summary_rows(self, organization_id):
        return self.db.execute(
            select(PayrollRun, PayrollPeriod)
            .join(PayrollPeriod, PayrollRun.payroll_period_id == PayrollPeriod.id)
            .where(PayrollRun.organization_id == organization_id, PayrollRun.deleted_at.is_(None))
            .order_by(PayrollPeriod.pay_date.desc())
        ).all()

    def employee_history_rows(self, organization_id, employee_id):
        return self.db.execute(
            select(PayrollEntry, PayrollRun, PayrollPeriod)
            .join(PayrollRun, PayrollEntry.payroll_run_id == PayrollRun.id)
            .join(PayrollPeriod, PayrollRun.payroll_period_id == PayrollPeriod.id)
            .where(
                PayrollEntry.organization_id == organization_id,
                PayrollEntry.employee_id == employee_id,
                PayrollRun.deleted_at.is_(None),
            )
            .order_by(PayrollPeriod.pay_date.desc(), PayrollEntry.created_at.desc())
        ).all()

    def liability_breakdown(self, organization_id):
        return self.db.execute(
            select(
                PayrollLineItem.name,
                PayrollLineItem.liability_account_id,
                func.sum(PayrollLineItem.amount),
            )
            .join(PayrollEntry, PayrollLineItem.payroll_entry_id == PayrollEntry.id)
            .join(PayrollRun, PayrollEntry.payroll_run_id == PayrollRun.id)
            .where(
                PayrollRun.organization_id == organization_id,
                PayrollRun.deleted_at.is_(None),
                PayrollRun.status == PayrollRunStatus.POSTED,
                PayrollRun.reversal_journal_id.is_(None),
                PayrollLineItem.liability_account_id.is_not(None),
            )
            .group_by(PayrollLineItem.name, PayrollLineItem.liability_account_id)
            .order_by(PayrollLineItem.name)
        ).all()
