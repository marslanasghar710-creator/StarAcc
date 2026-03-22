from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.core.enums import (
    EmployeeStatus,
    EmploymentType,
    PayrollLineItemType,
    PayrollPeriodStatus,
    PayrollRunStatus,
)
from app.core.exceptions import forbidden, not_found
from app.repositories.account_repository import AccountRepository
from app.repositories.audit import AuditRepository
from app.repositories.orgs import OrganizationRepository
from app.repositories.payroll_repository import PayrollRepository
from app.services.journal_service import JournalService

UTC = timezone.utc
ZERO = Decimal("0")
PRECISION = Decimal("0.00000001")


class PayrollService:
    def __init__(self, db: Session):
        self.db = db
        self.payroll = PayrollRepository(db)
        self.accounts = AccountRepository(db)
        self.audit = AuditRepository(db)
        self.organizations = OrganizationRepository(db)

    def _q(self, value) -> Decimal:
        return Decimal(value or 0).quantize(PRECISION, rounding=ROUND_HALF_UP)

    def _require_account(self, organization_id, account_id, *, detail="Account not found"):
        if account_id is None:
            return None
        account = self.accounts.get(organization_id, account_id)
        if not account or not account.is_active or not account.is_postable or account.deleted_at is not None:
            raise forbidden(detail)
        return account


    def _currency_code(self, organization_id):
        organization = self.organizations.get(organization_id)
        if not organization:
            raise not_found("Organization not found")
        return organization.base_currency

    def _validate_employee_payload(self, organization_id, payload, current=None):
        merged = {
            "email": current.email if current else None,
            "first_name": current.first_name if current else None,
            "last_name": current.last_name if current else None,
            "employment_type": current.employment_type if current else None,
            "start_date": current.start_date if current else None,
            "end_date": current.end_date if current else None,
            "status": current.status if current else EmployeeStatus.ACTIVE,
            "default_salary_amount": current.default_salary_amount if current else None,
            "default_hourly_rate": current.default_hourly_rate if current else None,
            "payroll_expense_account_id": current.payroll_expense_account_id if current else None,
            "payroll_settings_json": current.payroll_settings_json if current else None,
        }
        merged.update(payload)
        if not merged.get("first_name") or not merged.get("last_name"):
            raise forbidden("Employee first and last name are required")
        if not merged.get("email"):
            raise forbidden("Employee email is required")
        merged["email"] = merged["email"].lower()
        existing = self.payroll.get_employee_by_email(organization_id, merged["email"])
        if existing and (not current or existing.id != current.id):
            raise forbidden("Employee email must be unique within the organization")
        if merged.get("start_date") and merged.get("end_date") and merged["start_date"] > merged["end_date"]:
            raise forbidden("Employee start date cannot be after end date")
        if merged.get("default_salary_amount") is not None and self._q(merged["default_salary_amount"]) < ZERO:
            raise forbidden("Employee salary must be non-negative")
        if merged.get("default_hourly_rate") is not None and self._q(merged["default_hourly_rate"]) < ZERO:
            raise forbidden("Employee hourly rate must be non-negative")
        if merged.get("payroll_expense_account_id"):
            self._require_account(organization_id, merged["payroll_expense_account_id"], detail="Employee payroll expense account is invalid")
        return merged

    def create_employee(self, organization_id, actor_user_id, payload):
        normalized = self._validate_employee_payload(organization_id, payload)
        employee = self.payroll.create_employee(organization_id=organization_id, **normalized)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="employee.created", entity_type="employee", entity_id=str(employee.id))
        self.db.commit()
        return employee

    def get_employee(self, organization_id, employee_id):
        employee = self.payroll.get_employee(organization_id, employee_id)
        if not employee:
            raise not_found("Employee not found")
        return employee

    def list_employees(self, organization_id, status=None):
        return self.payroll.list_employees(organization_id, status=status)

    def update_employee(self, organization_id, employee_id, actor_user_id, payload):
        employee = self.get_employee(organization_id, employee_id)
        normalized = self._validate_employee_payload(organization_id, payload, current=employee)
        for key, value in normalized.items():
            setattr(employee, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="employee.updated", entity_type="employee", entity_id=str(employee.id))
        self.db.commit()
        return employee

    def archive_employee(self, organization_id, employee_id, actor_user_id):
        employee = self.get_employee(organization_id, employee_id)
        employee.status = EmployeeStatus.INACTIVE
        employee.deleted_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="employee.archived", entity_type="employee", entity_id=str(employee.id))
        self.db.commit()

    def _validate_earning_type_payload(self, organization_id, payload, current=None):
        code = payload.get("code", current.code if current else None)
        if not code:
            raise forbidden("Payroll earning type code is required")
        existing = self.payroll.get_earning_type_by_code(organization_id, code)
        if existing and (not current or existing.id != current.id):
            raise forbidden("Payroll earning type code must be unique within the organization")
        if payload.get("expense_account_id"):
            self._require_account(organization_id, payload["expense_account_id"], detail="Payroll earning expense account is invalid")

    def create_earning_type(self, organization_id, actor_user_id, payload):
        self._validate_earning_type_payload(organization_id, payload)
        earning_type = self.payroll.create_earning_type(organization_id=organization_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payroll.earning_type_created", entity_type="payroll_earning_type", entity_id=str(earning_type.id))
        self.db.commit()
        return earning_type

    def list_earning_types(self, organization_id):
        return self.payroll.list_earning_types(organization_id)

    def update_earning_type(self, organization_id, earning_type_id, actor_user_id, payload):
        earning_type = self.payroll.get_earning_type(organization_id, earning_type_id)
        if not earning_type:
            raise not_found("Payroll earning type not found")
        self._validate_earning_type_payload(organization_id, {**payload, "code": earning_type.code}, current=earning_type)
        for key, value in payload.items():
            setattr(earning_type, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payroll.earning_type_updated", entity_type="payroll_earning_type", entity_id=str(earning_type.id))
        self.db.commit()
        return earning_type

    def _validate_deduction_type_payload(self, organization_id, payload, current=None):
        code = payload.get("code", current.code if current else None)
        if not code:
            raise forbidden("Payroll deduction type code is required")
        existing = self.payroll.get_deduction_type_by_code(organization_id, code)
        if existing and (not current or existing.id != current.id):
            raise forbidden("Payroll deduction type code must be unique within the organization")
        liability_account_id = payload.get("liability_account_id", current.liability_account_id if current else None)
        if not liability_account_id:
            raise forbidden("Payroll deduction liability account is required")
        self._require_account(organization_id, liability_account_id, detail="Payroll deduction liability account is invalid")
        employer_expense_account_id = payload.get("employer_expense_account_id", current.employer_expense_account_id if current else None)
        if employer_expense_account_id:
            self._require_account(organization_id, employer_expense_account_id, detail="Payroll deduction employer expense account is invalid")

    def create_deduction_type(self, organization_id, actor_user_id, payload):
        self._validate_deduction_type_payload(organization_id, payload)
        deduction_type = self.payroll.create_deduction_type(organization_id=organization_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payroll.deduction_type_created", entity_type="payroll_deduction_type", entity_id=str(deduction_type.id))
        self.db.commit()
        return deduction_type

    def list_deduction_types(self, organization_id):
        return self.payroll.list_deduction_types(organization_id)

    def update_deduction_type(self, organization_id, deduction_type_id, actor_user_id, payload):
        deduction_type = self.payroll.get_deduction_type(organization_id, deduction_type_id)
        if not deduction_type:
            raise not_found("Payroll deduction type not found")
        self._validate_deduction_type_payload(organization_id, {**payload, "code": deduction_type.code}, current=deduction_type)
        for key, value in payload.items():
            setattr(deduction_type, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payroll.deduction_type_updated", entity_type="payroll_deduction_type", entity_id=str(deduction_type.id))
        self.db.commit()
        return deduction_type

    def create_period(self, organization_id, actor_user_id, payload):
        if payload["start_date"] > payload["end_date"]:
            raise forbidden("Payroll period start date cannot be after end date")
        if payload["pay_date"] < payload["start_date"]:
            raise forbidden("Payroll pay date cannot be before period start")
        existing = self.payroll.find_period_by_dates(organization_id, payload["start_date"], payload["end_date"])
        if existing:
            raise forbidden("Payroll period already exists for the same date range")
        period = self.payroll.create_period(organization_id=organization_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payroll.period_created", entity_type="payroll_period", entity_id=str(period.id))
        self.db.commit()
        return period

    def get_period(self, organization_id, period_id):
        period = self.payroll.get_period(organization_id, period_id)
        if not period:
            raise not_found("Payroll period not found")
        return period

    def list_periods(self, organization_id):
        return self.payroll.list_periods(organization_id)

    def create_run(self, organization_id, actor_user_id, payload):
        period = self.get_period(organization_id, payload["payroll_period_id"])
        if self.payroll.get_run_by_period(organization_id, period.id):
            raise forbidden("A payroll run already exists for this payroll period")
        self._require_account(organization_id, payload["funding_account_id"], detail="Payroll funding account is invalid")
        if payload.get("default_expense_account_id"):
            self._require_account(organization_id, payload["default_expense_account_id"], detail="Payroll default expense account is invalid")
        run = self.payroll.create_run(organization_id=organization_id, created_by_user_id=actor_user_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payroll.run_created", entity_type="payroll_run", entity_id=str(run.id))
        self.db.commit()
        return run

    def get_run(self, organization_id, run_id):
        run = self.payroll.get_run(organization_id, run_id)
        if not run:
            raise not_found("Payroll run not found")
        return run

    def list_runs(self, organization_id):
        return self.payroll.list_runs(organization_id)

    def _ensure_run_calculable(self, run):
        if run.status == PayrollRunStatus.POSTED:
            raise forbidden("Posted payroll runs cannot be recalculated")

    def _employee_is_active_for_period(self, employee, period):
        return (
            employee.status == EmployeeStatus.ACTIVE
            and employee.start_date <= period.end_date
            and (employee.end_date is None or employee.end_date >= period.start_date)
            and employee.deleted_at is None
        )

    def _expense_account_for_employee(self, organization_id, employee, run, override_account_id=None):
        expense_account_id = override_account_id or employee.payroll_expense_account_id or run.default_expense_account_id
        if not expense_account_id:
            raise forbidden("Payroll expense account is required to calculate payroll")
        self._require_account(organization_id, expense_account_id, detail="Payroll expense account is invalid")
        return expense_account_id

    def calculate_run(self, organization_id, run_id, actor_user_id, payload):
        run = self.get_run(organization_id, run_id)
        self._ensure_run_calculable(run)
        period = self.get_period(organization_id, run.payroll_period_id)
        employees = self.list_employees(organization_id)
        eligible_employees = [employee for employee in employees if self._employee_is_active_for_period(employee, period)]
        input_by_employee_id = {str(item["employee_id"]): item for item in payload.get("employee_inputs", [])}
        selected_employees = []
        if input_by_employee_id:
            eligible_by_id = {str(employee.id): employee for employee in eligible_employees}
            for employee_id, item in input_by_employee_id.items():
                employee = eligible_by_id.get(employee_id)
                if not employee:
                    raise forbidden("Payroll employee must be active in the payroll period and belong to the organization")
                selected_employees.append((employee, item))
        else:
            selected_employees = [(employee, {}) for employee in eligible_employees]
        if not selected_employees:
            raise forbidden("Payroll run requires at least one active employee")

        self.payroll.delete_entries_for_run(organization_id, run.id)
        gross_total = ZERO
        deductions_total = ZERO
        employer_cost_total = ZERO
        entry_count = 0

        for employee, employee_input in selected_employees:
            line_items = []
            gross_pay = ZERO
            deduction_total = ZERO
            employer_total = ZERO

            base_expense_account_id = self._expense_account_for_employee(organization_id, employee, run)
            if employee.employment_type == EmploymentType.SALARIED:
                salary_amount = employee_input.get("salary_override")
                if salary_amount is None:
                    salary_amount = employee.default_salary_amount
                salary_amount = self._q(salary_amount)
                if salary_amount > ZERO:
                    gross_pay += salary_amount
                    line_items.append({
                        "type": PayrollLineItemType.EARNING,
                        "name": "Base salary",
                        "amount": salary_amount,
                        "expense_account_id": base_expense_account_id,
                        "liability_account_id": None,
                        "earning_type_id": None,
                        "deduction_type_id": None,
                        "quantity": None,
                        "rate": None,
                    })
            elif employee.employment_type == EmploymentType.HOURLY:
                hours = self._q(employee_input.get("hours_worked")) if employee_input.get("hours_worked") is not None else ZERO
                rate = employee_input.get("hourly_rate_override")
                if rate is None:
                    rate = employee.default_hourly_rate
                rate = self._q(rate)
                if hours > ZERO:
                    if rate <= ZERO:
                        raise forbidden("Hourly employees require a positive hourly rate when hours are provided")
                    hourly_amount = self._q(hours * rate)
                    gross_pay += hourly_amount
                    line_items.append({
                        "type": PayrollLineItemType.EARNING,
                        "name": "Hours worked",
                        "amount": hourly_amount,
                        "expense_account_id": base_expense_account_id,
                        "liability_account_id": None,
                        "earning_type_id": None,
                        "deduction_type_id": None,
                        "quantity": hours,
                        "rate": rate,
                    })

            for earning_input in employee_input.get("additional_earnings", []):
                amount = self._q(earning_input.get("amount"))
                if amount == ZERO:
                    continue
                earning_type = None
                expense_account_id = base_expense_account_id
                name = earning_input.get("name") or "Additional earning"
                if earning_input.get("earning_type_id"):
                    earning_type = self.payroll.get_earning_type(organization_id, earning_input["earning_type_id"])
                    if not earning_type or not earning_type.is_active:
                        raise forbidden("Payroll earning type is invalid or inactive")
                    if earning_type.expense_account_id:
                        expense_account_id = self._expense_account_for_employee(organization_id, employee, run, override_account_id=earning_type.expense_account_id)
                    name = earning_type.name
                else:
                    expense_account_id = self._expense_account_for_employee(organization_id, employee, run, override_account_id=expense_account_id)
                gross_pay += amount
                line_items.append({
                    "type": PayrollLineItemType.EARNING,
                    "name": name,
                    "amount": amount,
                    "expense_account_id": expense_account_id,
                    "liability_account_id": None,
                    "earning_type_id": earning_type.id if earning_type else None,
                    "deduction_type_id": None,
                    "quantity": self._q(earning_input.get("quantity")) if earning_input.get("quantity") is not None else None,
                    "rate": self._q(earning_input.get("rate")) if earning_input.get("rate") is not None else None,
                })

            for deduction_input in employee_input.get("deductions", []):
                deduction_type = self.payroll.get_deduction_type(organization_id, deduction_input["deduction_type_id"])
                if not deduction_type or not deduction_type.is_active:
                    raise forbidden("Payroll deduction type is invalid or inactive")
                employee_amount = self._q(deduction_input.get("employee_amount"))
                employer_amount = self._q(deduction_input.get("employer_amount"))
                if employee_amount > ZERO:
                    deduction_total += employee_amount
                    line_items.append({
                        "type": PayrollLineItemType.DEDUCTION,
                        "name": deduction_type.name,
                        "amount": employee_amount,
                        "expense_account_id": None,
                        "liability_account_id": deduction_type.liability_account_id,
                        "earning_type_id": None,
                        "deduction_type_id": deduction_type.id,
                        "quantity": None,
                        "rate": None,
                    })
                if employer_amount > ZERO:
                    if not deduction_type.employer_expense_account_id:
                        raise forbidden("Employer payroll deductions require an employer expense account")
                    employer_total += employer_amount
                    line_items.append({
                        "type": PayrollLineItemType.EMPLOYER_COST,
                        "name": deduction_type.name,
                        "amount": employer_amount,
                        "expense_account_id": deduction_type.employer_expense_account_id,
                        "liability_account_id": deduction_type.liability_account_id,
                        "earning_type_id": None,
                        "deduction_type_id": deduction_type.id,
                        "quantity": None,
                        "rate": None,
                    })

            if gross_pay <= ZERO:
                raise forbidden("Payroll entry must include positive gross earnings")
            if deduction_total > gross_pay:
                raise forbidden("Payroll deductions cannot exceed gross pay")
            net_pay = self._q(gross_pay - deduction_total)
            if net_pay < ZERO:
                raise forbidden("Payroll net pay cannot be negative")

            entry = self.payroll.create_entry(
                organization_id=organization_id,
                payroll_run_id=run.id,
                employee_id=employee.id,
                gross_pay=gross_pay,
                total_deductions=deduction_total,
                employer_costs=employer_total,
                net_pay=net_pay,
            )
            for line_item in line_items:
                self.payroll.create_line_item(organization_id=organization_id, payroll_entry_id=entry.id, **line_item)

            gross_total += gross_pay
            deductions_total += deduction_total
            employer_cost_total += employer_total
            entry_count += 1

        run.total_gross = self._q(gross_total)
        run.total_deductions = self._q(deductions_total)
        run.total_employer_costs = self._q(employer_cost_total)
        run.total_net = self._q(gross_total - deductions_total)
        run.entry_count = entry_count
        run.status = PayrollRunStatus.CALCULATED
        run.calculated_at = datetime.now(UTC)
        period.status = PayrollPeriodStatus.PROCESSED
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payroll.run_calculated", entity_type="payroll_run", entity_id=str(run.id), metadata_json={"entry_count": entry_count})
        self.db.commit()
        return run

    def list_entries(self, organization_id, run_id):
        self.get_run(organization_id, run_id)
        return self.payroll.list_entries(organization_id, run_id)

    def get_entry_detail(self, organization_id, entry_id):
        entry = self.payroll.get_entry(organization_id, entry_id)
        if not entry:
            raise not_found("Payroll entry not found")
        return {"entry": entry, "line_items": self.payroll.list_line_items(organization_id, entry.id)}

    def post_run(self, organization_id, run_id, actor_user_id):
        run = self.get_run(organization_id, run_id)
        if run.status != PayrollRunStatus.CALCULATED:
            raise forbidden("Payroll run must be calculated before posting")
        if run.posted_journal_id:
            raise forbidden("Payroll run has already been posted")
        period = self.get_period(organization_id, run.payroll_period_id)
        self._require_account(organization_id, run.funding_account_id, detail="Payroll funding account is invalid")
        entries = self.payroll.list_entries(organization_id, run.id)
        if not entries:
            raise forbidden("Payroll run has no calculated entries")

        debit_by_account = {}
        credit_by_account = {}
        for entry in entries:
            for line_item in self.payroll.list_line_items(organization_id, entry.id):
                amount = self._q(line_item.amount)
                if line_item.type in {PayrollLineItemType.EARNING, PayrollLineItemType.EMPLOYER_COST}:
                    if not line_item.expense_account_id:
                        raise forbidden("Payroll expense account is required for payroll posting")
                    debit_by_account[line_item.expense_account_id] = debit_by_account.get(line_item.expense_account_id, ZERO) + amount
                if line_item.type in {PayrollLineItemType.DEDUCTION, PayrollLineItemType.EMPLOYER_COST}:
                    if not line_item.liability_account_id:
                        raise forbidden("Payroll liability account is required for payroll posting")
                    credit_by_account[line_item.liability_account_id] = credit_by_account.get(line_item.liability_account_id, ZERO) + amount

        credit_by_account[run.funding_account_id] = credit_by_account.get(run.funding_account_id, ZERO) + self._q(run.total_net)
        journal_lines = []
        for account_id, amount in sorted(debit_by_account.items(), key=lambda item: str(item[0])):
            journal_lines.append({
                "account_id": account_id,
                "description": f"Payroll expense {period.pay_date}",
                "debit_amount": self._q(amount),
                "credit_amount": ZERO,
                "currency_code": self._currency_code(organization_id),
                "exchange_rate": None,
            })
        for account_id, amount in sorted(credit_by_account.items(), key=lambda item: str(item[0])):
            journal_lines.append({
                "account_id": account_id,
                "description": f"Payroll liability/funding {period.pay_date}",
                "debit_amount": ZERO,
                "credit_amount": self._q(amount),
                "currency_code": self._currency_code(organization_id),
                "exchange_rate": None,
            })
        payload = {
            "entry_date": period.pay_date,
            "description": f"Payroll run {period.start_date} to {period.end_date}",
            "reference": run.reference,
            "source_module": "payroll",
            "source_type": "payroll_run",
            "source_id": str(run.id),
            "lines": [type("L", (), line) for line in journal_lines],
        }
        journal = JournalService(self.db).create_and_post(organization_id, actor_user_id, payload)
        run.status = PayrollRunStatus.POSTED
        run.posted_journal_id = journal.id
        run.posted_at = datetime.now(UTC)
        period.status = PayrollPeriodStatus.POSTED
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="payroll.run_posted", entity_type="payroll_run", entity_id=str(run.id), metadata_json={"journal_id": str(journal.id)})
        self.db.commit()
        return run

    def payroll_summary(self, organization_id):
        rows = self.payroll.payroll_summary_rows(organization_id)
        return [
            {
                "payroll_run_id": run.id,
                "payroll_period_id": period.id,
                "period_start_date": period.start_date,
                "period_end_date": period.end_date,
                "pay_date": period.pay_date,
                "status": run.status,
                "total_gross": run.total_gross,
                "total_net": run.total_net,
                "total_deductions": run.total_deductions,
                "total_employer_costs": run.total_employer_costs,
                "entry_count": run.entry_count,
            }
            for run, period in rows
        ]

    def payroll_liabilities(self, organization_id):
        return [
            {"name": name, "liability_account_id": liability_account_id, "amount": self._q(amount)}
            for name, liability_account_id, amount in self.payroll.liability_breakdown(organization_id)
        ]
