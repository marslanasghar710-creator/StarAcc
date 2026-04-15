from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Callable
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import Date, DateTime, Integer, Numeric, String, and_, cast, func, literal, or_, select
from sqlalchemy.orm import Session, aliased
from sqlalchemy.sql import ColumnElement

from app.core.enums import ReportRunStatus, ReportType
from app.core.exceptions import forbidden, not_found
from app.db.models import (
    Account,
    BankAccount,
    BankTransaction,
    Bill,
    CustomReportDefinition,
    Customer,
    Employee,
    InventoryBalance,
    Invoice,
    Item,
    JournalEntry,
    JournalLine,
    PayrollEntry,
    PayrollPeriod,
    PayrollRun,
    Project,
    ProjectCostEntry,
    ProjectRevenueEntry,
    Supplier,
    User,
)
from app.repositories.audit import AuditRepository
from app.repositories.custom_report_repository import CustomReportRepository
from app.repositories.rbac import RBACRepository
from app.schemas.custom_reporting import (
    CustomReportDatasetResponse,
    CustomReportDatasetSummaryResponse,
    CustomReportDefinitionCreate,
    CustomReportDefinitionResponse,
    CustomReportDefinitionUpdate,
    CustomReportExecutionMetadataResponse,
    CustomReportExportRequest,
    CustomReportFieldOptionResponse,
    CustomReportFieldResponse,
    CustomReportFilterInput,
    CustomReportPreviewRequest,
    CustomReportResultResponse,
    CustomReportSortInput,
    FieldDataType,
    FieldKind,
    FilterOperator,
)
from app.services.entitlements_service import EntitlementsService
from app.services.reporting.report_export_service import ReportExportService

UTC = timezone.utc
ZERO = Decimal("0")


@dataclass(slots=True)
class FieldDefinition:
    key: str
    label: str
    data_type: FieldDataType
    kind: FieldKind = "dimension"
    description: str | None = None
    filter_operators: tuple[FilterOperator, ...] = ("eq", "neq")
    sortable: bool = True
    groupable: bool = True
    aggregations: tuple[str, ...] = ()
    options: tuple[tuple[str, str], ...] = ()

    def to_response(self) -> CustomReportFieldResponse:
        return CustomReportFieldResponse(
            key=self.key,
            label=self.label,
            description=self.description,
            data_type=self.data_type,
            kind=self.kind,
            filter_operators=list(self.filter_operators),
            sortable=self.sortable,
            groupable=self.groupable,
            aggregations=list(self.aggregations),
            options=[CustomReportFieldOptionResponse(value=value, label=label) for value, label in self.options],
        )


@dataclass(slots=True)
class DatasetDefinition:
    id: str
    key: str
    name: str
    description: str
    required_permissions: tuple[str, ...]
    default_columns: tuple[str, ...]
    fields: tuple[FieldDefinition, ...]
    builder: Callable[[str], tuple[Any, dict[str, ColumnElement[Any]]]]

    def summary(self) -> CustomReportDatasetSummaryResponse:
        return CustomReportDatasetSummaryResponse(
            id=self.id,
            key=self.key,
            name=self.name,
            description=self.description,
            required_permissions=list(self.required_permissions),
            default_columns=list(self.default_columns),
        )

    def detail(self) -> CustomReportDatasetResponse:
        field_responses = [field.to_response() for field in self.fields]
        return CustomReportDatasetResponse(
            **self.summary().model_dump(),
            fields=field_responses,
            supported_filters=field_responses,
            supported_groupings=[field.to_response() for field in self.fields if field.groupable and field.kind == "dimension"],
        )


class CustomReportingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CustomReportRepository(db)
        self.audit = AuditRepository(db)
        self.rbac = RBACRepository(db)
        self.exporter = ReportExportService(db)
        self.datasets = self._build_datasets()

    def _enforce_advanced_reporting(self, organization_id: str):
        EntitlementsService(self.db).enforce_feature(organization_id, "advanced_reporting")

    def _account_dataset(self, organization_id: str):
        balance_sq = (
            select(
                JournalLine.account_id.label("account_id"),
                func.coalesce(func.sum(JournalLine.base_debit_amount - JournalLine.base_credit_amount), 0).label("balance"),
            )
            .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
            .where(JournalLine.organization_id == organization_id, JournalEntry.organization_id == organization_id, JournalEntry.status == "posted")
            .group_by(JournalLine.account_id)
            .subquery()
        )
        from_clause = Account.__table__.outerjoin(balance_sq, balance_sq.c.account_id == Account.id)
        exprs: dict[str, ColumnElement[Any]] = {
            "account_code": Account.code,
            "account_name": Account.name,
            "account_type": cast(Account.account_type, String()),
            "normal_balance": Account.normal_balance,
            "is_active": Account.deleted_at.is_(None),
            "current_balance": cast(func.coalesce(balance_sq.c.balance, 0), Numeric(20, 8)),
            "created_at": Account.created_at,
        }
        return from_clause, exprs

    def _journal_line_dataset(self, organization_id: str):
        from_clause = (
            JournalLine.__table__
            .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
            .join(Account, Account.id == JournalLine.account_id)
        )
        exprs = {
            "entry_date": JournalEntry.entry_date,
            "entry_number": JournalEntry.entry_number,
            "source_module": JournalEntry.source_module,
            "journal_status": cast(JournalEntry.status, String()),
            "account_code": Account.code,
            "account_name": Account.name,
            "line_description": func.coalesce(JournalLine.description, JournalEntry.description),
            "debit_amount": cast(JournalLine.base_debit_amount, Numeric(20, 8)),
            "credit_amount": cast(JournalLine.base_credit_amount, Numeric(20, 8)),
            "net_amount": cast(JournalLine.base_debit_amount - JournalLine.base_credit_amount, Numeric(20, 8)),
            "created_at": JournalLine.created_at,
        }
        return from_clause, exprs

    def _invoice_dataset(self, organization_id: str):
        from_clause = Invoice.__table__.join(Customer, Customer.id == Invoice.customer_id)
        exprs = {
            "invoice_number": Invoice.invoice_number,
            "status": cast(Invoice.status, String()),
            "issue_date": Invoice.issue_date,
            "due_date": Invoice.due_date,
            "customer_name": Customer.display_name,
            "currency_code": Invoice.currency_code,
            "reference": Invoice.reference,
            "total_amount": cast(Invoice.total_amount, Numeric(20, 8)),
            "amount_due": cast(Invoice.amount_due, Numeric(20, 8)),
            "amount_paid": cast(Invoice.amount_paid, Numeric(20, 8)),
            "created_at": Invoice.created_at,
        }
        return from_clause, exprs

    def _bill_dataset(self, organization_id: str):
        from_clause = Bill.__table__.join(Supplier, Supplier.id == Bill.supplier_id)
        exprs = {
            "bill_number": Bill.bill_number,
            "status": cast(Bill.status, String()),
            "issue_date": Bill.issue_date,
            "due_date": Bill.due_date,
            "supplier_name": Supplier.display_name,
            "currency_code": Bill.currency_code,
            "reference": Bill.reference,
            "total_amount": cast(Bill.total_amount, Numeric(20, 8)),
            "amount_due": cast(Bill.amount_due, Numeric(20, 8)),
            "amount_paid": cast(Bill.amount_paid, Numeric(20, 8)),
            "created_at": Bill.created_at,
        }
        return from_clause, exprs

    def _bank_transaction_dataset(self, organization_id: str):
        from_clause = BankTransaction.__table__.join(BankAccount, BankAccount.id == BankTransaction.bank_account_id)
        exprs = {
            "transaction_date": BankTransaction.transaction_date,
            "posted_date": BankTransaction.posted_date,
            "bank_account_name": BankAccount.name,
            "transaction_type": cast(BankTransaction.transaction_type, String()),
            "status": cast(BankTransaction.status, String()),
            "reference": BankTransaction.reference,
            "description": BankTransaction.description,
            "source_module": BankTransaction.source_module,
            "amount": cast(BankTransaction.amount, Numeric(20, 8)),
            "gross_amount": cast(func.coalesce(BankTransaction.gross_amount, BankTransaction.amount), Numeric(20, 8)),
            "created_at": BankTransaction.created_at,
        }
        return from_clause, exprs

    def _inventory_item_dataset(self, organization_id: str):
        balance_sq = (
            select(
                InventoryBalance.item_id.label("item_id"),
                func.coalesce(func.sum(InventoryBalance.quantity_on_hand), 0).label("quantity_on_hand"),
                func.coalesce(func.sum(InventoryBalance.available_quantity), 0).label("available_quantity"),
                func.coalesce(func.sum(InventoryBalance.inventory_value), 0).label("inventory_value"),
            )
            .where(InventoryBalance.organization_id == organization_id)
            .group_by(InventoryBalance.item_id)
            .subquery()
        )
        from_clause = Item.__table__.outerjoin(balance_sq, balance_sq.c.item_id == Item.id)
        exprs = {
            "sku": Item.sku,
            "item_name": Item.name,
            "is_active": Item.archived_at.is_(None),
            "is_tracked_inventory": Item.is_tracked_inventory,
            "unit_of_measure": Item.unit_of_measure,
            "sales_price": cast(Item.sales_price, Numeric(20, 8)),
            "purchase_price": cast(Item.purchase_price, Numeric(20, 8)),
            "quantity_on_hand": cast(func.coalesce(balance_sq.c.quantity_on_hand, 0), Numeric(20, 8)),
            "available_quantity": cast(func.coalesce(balance_sq.c.available_quantity, 0), Numeric(20, 8)),
            "inventory_value": cast(func.coalesce(balance_sq.c.inventory_value, 0), Numeric(20, 8)),
            "created_at": Item.created_at,
        }
        return from_clause, exprs

    def _project_dataset(self, organization_id: str):
        revenue_sq = (
            select(
                ProjectRevenueEntry.project_id.label("project_id"),
                func.coalesce(func.sum(ProjectRevenueEntry.amount), 0).label("recognized_revenue"),
            )
            .where(ProjectRevenueEntry.organization_id == organization_id)
            .group_by(ProjectRevenueEntry.project_id)
            .subquery()
        )
        cost_sq = (
            select(
                ProjectCostEntry.project_id.label("project_id"),
                func.coalesce(func.sum(ProjectCostEntry.amount), 0).label("recognized_cost"),
            )
            .where(ProjectCostEntry.organization_id == organization_id)
            .group_by(ProjectCostEntry.project_id)
            .subquery()
        )
        from_clause = (
            Project.__table__
            .outerjoin(revenue_sq, revenue_sq.c.project_id == Project.id)
            .outerjoin(cost_sq, cost_sq.c.project_id == Project.id)
        )
        exprs = {
            "project_code": Project.code,
            "project_name": Project.name,
            "status": cast(Project.status, String()),
            "start_date": Project.start_date,
            "end_date": Project.end_date,
            "budget_revenue": cast(Project.budget_revenue, Numeric(20, 8)),
            "budget_cost": cast(Project.budget_cost, Numeric(20, 8)),
            "recognized_revenue": cast(func.coalesce(revenue_sq.c.recognized_revenue, 0), Numeric(20, 8)),
            "recognized_cost": cast(func.coalesce(cost_sq.c.recognized_cost, 0), Numeric(20, 8)),
            "margin": cast(func.coalesce(revenue_sq.c.recognized_revenue, 0) - func.coalesce(cost_sq.c.recognized_cost, 0), Numeric(20, 8)),
            "created_at": Project.created_at,
        }
        return from_clause, exprs

    def _payroll_entry_dataset(self, organization_id: str):
        from_clause = (
            PayrollEntry.__table__
            .join(Employee, Employee.id == PayrollEntry.employee_id)
            .join(PayrollRun, PayrollRun.id == PayrollEntry.payroll_run_id)
            .join(PayrollPeriod, PayrollPeriod.id == PayrollRun.payroll_period_id)
        )
        employee_name = func.concat(Employee.first_name, literal(" "), Employee.last_name)
        exprs = {
            "employee_name": employee_name,
            "employee_email": Employee.email,
            "employment_type": cast(Employee.employment_type, String()),
            "run_status": cast(PayrollRun.status, String()),
            "period_start": PayrollPeriod.start_date,
            "period_end": PayrollPeriod.end_date,
            "pay_date": PayrollPeriod.pay_date,
            "gross_pay": cast(PayrollEntry.gross_pay, Numeric(20, 8)),
            "net_pay": cast(PayrollEntry.net_pay, Numeric(20, 8)),
            "total_deductions": cast(PayrollEntry.total_deductions, Numeric(20, 8)),
            "employer_costs": cast(PayrollEntry.employer_costs, Numeric(20, 8)),
            "created_at": PayrollEntry.created_at,
        }
        return from_clause, exprs

    def _build_datasets(self) -> dict[str, DatasetDefinition]:
        string_ops = ("eq", "neq", "contains", "starts_with", "in", "is_null", "not_null")
        date_ops = ("eq", "neq", "gte", "lte", "between", "is_null", "not_null")
        number_ops = ("eq", "neq", "gt", "gte", "lt", "lte", "between", "is_null", "not_null")
        bool_ops = ("eq", "neq")
        datasets = [
            DatasetDefinition(
                id="accounts",
                key="accounts",
                name="Accounts",
                description="Chart of accounts and current balances derived from posted journals.",
                required_permissions=("accounts.read",),
                default_columns=("account_code", "account_name", "account_type", "current_balance"),
                fields=(
                    FieldDefinition("account_code", "Account code", "string", filter_operators=string_ops),
                    FieldDefinition("account_name", "Account name", "string", filter_operators=string_ops),
                    FieldDefinition("account_type", "Account type", "enum", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("normal_balance", "Normal balance", "enum", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("is_active", "Active", "boolean", filter_operators=bool_ops),
                    FieldDefinition("current_balance", "Current balance", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("created_at", "Created at", "datetime", filter_operators=date_ops),
                ),
                builder=self._account_dataset,
            ),
            DatasetDefinition(
                id="journal_lines",
                key="journal_lines",
                name="Journal lines",
                description="Posted general-ledger detail with account, source, and movement fields.",
                required_permissions=("reports.general_ledger.read", "ledger.read"),
                default_columns=("entry_date", "entry_number", "account_code", "account_name", "debit_amount", "credit_amount"),
                fields=(
                    FieldDefinition("entry_date", "Entry date", "date", filter_operators=date_ops),
                    FieldDefinition("entry_number", "Entry number", "string", filter_operators=string_ops),
                    FieldDefinition("source_module", "Source module", "string", filter_operators=string_ops),
                    FieldDefinition("journal_status", "Journal status", "enum", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("account_code", "Account code", "string", filter_operators=string_ops),
                    FieldDefinition("account_name", "Account name", "string", filter_operators=string_ops),
                    FieldDefinition("line_description", "Description", "string", filter_operators=string_ops),
                    FieldDefinition("debit_amount", "Debit", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("credit_amount", "Credit", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("net_amount", "Net movement", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("created_at", "Created at", "datetime", filter_operators=date_ops),
                ),
                builder=self._journal_line_dataset,
            ),
            DatasetDefinition(
                id="invoices",
                key="invoices",
                name="Invoices",
                description="Sales invoices with customer, date, status, and amount visibility.",
                required_permissions=("invoices.read",),
                default_columns=("invoice_number", "customer_name", "status", "issue_date", "total_amount", "amount_due"),
                fields=(
                    FieldDefinition("invoice_number", "Invoice number", "string", filter_operators=string_ops),
                    FieldDefinition("status", "Status", "enum", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("issue_date", "Issue date", "date", filter_operators=date_ops),
                    FieldDefinition("due_date", "Due date", "date", filter_operators=date_ops),
                    FieldDefinition("customer_name", "Customer", "string", filter_operators=string_ops),
                    FieldDefinition("currency_code", "Currency", "string", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("reference", "Reference", "string", filter_operators=string_ops),
                    FieldDefinition("total_amount", "Total amount", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("amount_due", "Amount due", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("amount_paid", "Amount paid", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("created_at", "Created at", "datetime", filter_operators=date_ops),
                ),
                builder=self._invoice_dataset,
            ),
            DatasetDefinition(
                id="bills",
                key="bills",
                name="Bills",
                description="Purchase bills with supplier, due-date, status, and payable metrics.",
                required_permissions=("bills.read",),
                default_columns=("bill_number", "supplier_name", "status", "issue_date", "total_amount", "amount_due"),
                fields=(
                    FieldDefinition("bill_number", "Bill number", "string", filter_operators=string_ops),
                    FieldDefinition("status", "Status", "enum", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("issue_date", "Issue date", "date", filter_operators=date_ops),
                    FieldDefinition("due_date", "Due date", "date", filter_operators=date_ops),
                    FieldDefinition("supplier_name", "Supplier", "string", filter_operators=string_ops),
                    FieldDefinition("currency_code", "Currency", "string", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("reference", "Reference", "string", filter_operators=string_ops),
                    FieldDefinition("total_amount", "Total amount", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("amount_due", "Amount due", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("amount_paid", "Amount paid", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("created_at", "Created at", "datetime", filter_operators=date_ops),
                ),
                builder=self._bill_dataset,
            ),
            DatasetDefinition(
                id="bank_transactions",
                key="bank_transactions",
                name="Bank transactions",
                description="Imported and reconciled bank transactions with source and reconciliation status.",
                required_permissions=("bank_transactions.read",),
                default_columns=("transaction_date", "bank_account_name", "description", "status", "amount"),
                fields=(
                    FieldDefinition("transaction_date", "Transaction date", "date", filter_operators=date_ops),
                    FieldDefinition("posted_date", "Posted date", "date", filter_operators=date_ops),
                    FieldDefinition("bank_account_name", "Bank account", "string", filter_operators=string_ops),
                    FieldDefinition("transaction_type", "Transaction type", "enum", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("status", "Status", "enum", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("reference", "Reference", "string", filter_operators=string_ops),
                    FieldDefinition("description", "Description", "string", filter_operators=string_ops),
                    FieldDefinition("source_module", "Source module", "string", filter_operators=string_ops),
                    FieldDefinition("amount", "Amount", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("gross_amount", "Gross amount", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("created_at", "Created at", "datetime", filter_operators=date_ops),
                ),
                builder=self._bank_transaction_dataset,
            ),
            DatasetDefinition(
                id="inventory_items",
                key="inventory_items",
                name="Inventory items",
                description="Item master data enriched with current stock and valuation balances.",
                required_permissions=("inventory.read",),
                default_columns=("sku", "item_name", "is_tracked_inventory", "quantity_on_hand", "inventory_value"),
                fields=(
                    FieldDefinition("sku", "SKU", "string", filter_operators=string_ops),
                    FieldDefinition("item_name", "Item name", "string", filter_operators=string_ops),
                    FieldDefinition("is_active", "Active", "boolean", filter_operators=bool_ops),
                    FieldDefinition("is_tracked_inventory", "Tracked inventory", "boolean", filter_operators=bool_ops),
                    FieldDefinition("unit_of_measure", "Unit of measure", "string", filter_operators=string_ops),
                    FieldDefinition("sales_price", "Sales price", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("purchase_price", "Purchase price", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("quantity_on_hand", "Quantity on hand", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("available_quantity", "Available quantity", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("inventory_value", "Inventory value", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("created_at", "Created at", "datetime", filter_operators=date_ops),
                ),
                builder=self._inventory_item_dataset,
            ),
            DatasetDefinition(
                id="projects",
                key="projects",
                name="Projects",
                description="Project profitability summary driven by persisted revenue and cost entries.",
                required_permissions=("projects.read",),
                default_columns=("project_code", "project_name", "status", "recognized_revenue", "recognized_cost", "margin"),
                fields=(
                    FieldDefinition("project_code", "Project code", "string", filter_operators=string_ops),
                    FieldDefinition("project_name", "Project name", "string", filter_operators=string_ops),
                    FieldDefinition("status", "Status", "enum", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("start_date", "Start date", "date", filter_operators=date_ops),
                    FieldDefinition("end_date", "End date", "date", filter_operators=date_ops),
                    FieldDefinition("budget_revenue", "Budget revenue", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("budget_cost", "Budget cost", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("recognized_revenue", "Recognized revenue", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("recognized_cost", "Recognized cost", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("margin", "Margin", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("created_at", "Created at", "datetime", filter_operators=date_ops),
                ),
                builder=self._project_dataset,
            ),
            DatasetDefinition(
                id="payroll_entries",
                key="payroll_entries",
                name="Payroll entries",
                description="Payroll run results by employee with gross, net, and deduction metrics.",
                required_permissions=("payroll.read",),
                default_columns=("employee_name", "period_start", "period_end", "gross_pay", "net_pay", "total_deductions"),
                fields=(
                    FieldDefinition("employee_name", "Employee", "string", filter_operators=string_ops),
                    FieldDefinition("employee_email", "Employee email", "string", filter_operators=string_ops),
                    FieldDefinition("employment_type", "Employment type", "enum", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("run_status", "Run status", "enum", filter_operators=("eq", "neq", "in")),
                    FieldDefinition("period_start", "Period start", "date", filter_operators=date_ops),
                    FieldDefinition("period_end", "Period end", "date", filter_operators=date_ops),
                    FieldDefinition("pay_date", "Pay date", "date", filter_operators=date_ops),
                    FieldDefinition("gross_pay", "Gross pay", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("net_pay", "Net pay", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("total_deductions", "Total deductions", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("employer_costs", "Employer costs", "number", kind="metric", filter_operators=number_ops, groupable=False, aggregations=("sum",)),
                    FieldDefinition("created_at", "Created at", "datetime", filter_operators=date_ops),
                ),
                builder=self._payroll_entry_dataset,
            ),
        ]
        return {dataset.id: dataset for dataset in datasets}

    def _field_map(self, dataset: DatasetDefinition) -> dict[str, FieldDefinition]:
        return {field.key: field for field in dataset.fields}

    def _has_any_permission(self, role_id: UUID, permission_codes: tuple[str, ...]) -> bool:
        return any(self.rbac.role_has_permission(role_id, code) for code in permission_codes)

    def _get_dataset_or_404(self, dataset_id: str) -> DatasetDefinition:
        dataset = self.datasets.get(dataset_id)
        if not dataset:
            raise not_found("Custom report dataset not found")
        return dataset

    def _ensure_dataset_access(self, role_id: UUID, dataset: DatasetDefinition):
        if not self._has_any_permission(role_id, dataset.required_permissions):
            raise forbidden("You do not have access to this reporting dataset")

    def list_datasets(self, organization_id: str, role_id: UUID) -> list[CustomReportDatasetSummaryResponse]:
        self._enforce_advanced_reporting(organization_id)
        return [dataset.summary() for dataset in self.datasets.values() if self._has_any_permission(role_id, dataset.required_permissions)]

    def get_dataset(self, organization_id: str, role_id: UUID, dataset_id: str) -> CustomReportDatasetResponse:
        self._enforce_advanced_reporting(organization_id)
        dataset = self._get_dataset_or_404(dataset_id)
        self._ensure_dataset_access(role_id, dataset)
        return dataset.detail()

    def validate_definition(self, role_id: UUID, payload: CustomReportPreviewRequest | CustomReportDefinitionCreate):
        dataset = self._get_dataset_or_404(payload.dataset_id)
        self._ensure_dataset_access(role_id, dataset)
        field_map = self._field_map(dataset)
        errors: list[str] = []

        for column in payload.columns:
            if column not in field_map:
                errors.append(f"Unknown column '{column}' for dataset '{dataset.id}'")
        for grouping in payload.groupings:
            if grouping not in field_map:
                errors.append(f"Unknown grouping field '{grouping}'")
            elif not field_map[grouping].groupable or field_map[grouping].kind != "dimension":
                errors.append(f"Field '{grouping}' cannot be used for grouping")
        if payload.groupings:
            for column in payload.columns:
                field = field_map.get(column)
                if field and field.kind == "dimension" and column not in payload.groupings:
                    errors.append(f"Dimension column '{column}' must also be selected as a grouping when groupings are used")
        for sort in payload.sorting:
            field = field_map.get(sort.field)
            if not field:
                errors.append(f"Unknown sort field '{sort.field}'")
            elif not field.sortable:
                errors.append(f"Field '{sort.field}' cannot be sorted")
        for item in payload.filters:
            field = field_map.get(item.field)
            if not field:
                errors.append(f"Unknown filter field '{item.field}'")
                continue
            if item.operator not in field.filter_operators:
                errors.append(f"Operator '{item.operator}' is not supported for field '{item.field}'")
        if errors:
            raise HTTPException(status_code=422, detail=errors)
        return dataset, field_map

    def _coerce_scalar(self, value: Any, data_type: FieldDataType):
        if value is None:
            return None
        if data_type in {"string", "enum", "uuid"}:
            return str(value)
        if data_type == "number":
            return Decimal(str(value))
        if data_type == "boolean":
            if isinstance(value, bool):
                return value
            if str(value).lower() in {"true", "1", "yes"}:
                return True
            if str(value).lower() in {"false", "0", "no"}:
                return False
            raise HTTPException(status_code=422, detail=[f"Invalid boolean value '{value}'"])
        if data_type == "date":
            if isinstance(value, date) and not isinstance(value, datetime):
                return value
            return date.fromisoformat(str(value))
        if data_type == "datetime":
            if isinstance(value, datetime):
                return value
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return value

    def _filter_clause(self, expression: ColumnElement[Any], field: FieldDefinition, item: CustomReportFilterInput):
        operator = item.operator
        if operator == "is_null":
            return expression.is_(None)
        if operator == "not_null":
            return expression.is_not(None)
        if operator == "in":
            values = [self._coerce_scalar(value, field.data_type) for value in (item.value or [])]
            return expression.in_(values)
        value = self._coerce_scalar(item.value, field.data_type)
        if operator == "between":
            value_to = self._coerce_scalar(item.value_to, field.data_type)
            return expression.between(value, value_to)
        if field.data_type in {"string", "enum", "uuid"}:
            lowered = func.lower(cast(expression, String()))
            compare = str(value).lower()
            if operator == "eq":
                return lowered == compare
            if operator == "neq":
                return lowered != compare
            if operator == "contains":
                return lowered.contains(compare)
            if operator == "starts_with":
                return lowered.startswith(compare)
        else:
            if operator == "eq":
                return expression == value
            if operator == "neq":
                return expression != value
            if operator == "gt":
                return expression > value
            if operator == "gte":
                return expression >= value
            if operator == "lt":
                return expression < value
            if operator == "lte":
                return expression <= value
        raise HTTPException(status_code=422, detail=[f"Unsupported operator '{operator}' for field '{field.key}'"])

    def _serialize_value(self, value: Any):
        if isinstance(value, Decimal):
            return value.quantize(Decimal("0.01")) if value == value.quantize(Decimal("0.01")) else value.normalize()
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if isinstance(value, UUID):
            return str(value)
        return value

    def _filter_summary(self, payload: CustomReportPreviewRequest, field_map: dict[str, FieldDefinition]) -> list[str]:
        parts: list[str] = []
        for item in payload.filters:
            field = field_map[item.field]
            if item.operator == "between":
                parts.append(f"{field.label} between {item.value} and {item.value_to}")
            elif item.operator == "is_null":
                parts.append(f"{field.label} is blank")
            elif item.operator == "not_null":
                parts.append(f"{field.label} is not blank")
            else:
                parts.append(f"{field.label} {item.operator.replace('_', ' ')} {item.value}")
        return parts

    def execute_preview(
        self,
        *,
        organization_id: str,
        role_id: UUID,
        requested_by_user_id: str | UUID | None,
        requested_by_email: str | None,
        payload: CustomReportPreviewRequest,
        report_definition_id: UUID | None = None,
        persist_execution: bool = False,
    ) -> CustomReportResultResponse:
        self._enforce_advanced_reporting(organization_id)
        dataset, field_map = self.validate_definition(role_id, payload)
        from_clause, exprs = dataset.builder(organization_id)
        where_clauses = [self._filter_clause(exprs[item.field], field_map[item.field], item) for item in payload.filters]
        base_query = select().select_from(from_clause)
        base_query = base_query.where(*where_clauses)
        if dataset.id == "accounts":
            base_query = base_query.where(Account.organization_id == organization_id)
        elif dataset.id == "journal_lines":
            base_query = base_query.where(JournalLine.organization_id == organization_id, JournalEntry.organization_id == organization_id, JournalEntry.status == "posted")
        elif dataset.id == "invoices":
            base_query = base_query.where(Invoice.organization_id == organization_id)
        elif dataset.id == "bills":
            base_query = base_query.where(Bill.organization_id == organization_id)
        elif dataset.id == "bank_transactions":
            base_query = base_query.where(BankTransaction.organization_id == organization_id)
        elif dataset.id == "inventory_items":
            base_query = base_query.where(Item.organization_id == organization_id)
        elif dataset.id == "projects":
            base_query = base_query.where(Project.organization_id == organization_id)
        elif dataset.id == "payroll_entries":
            base_query = base_query.where(PayrollEntry.organization_id == organization_id)

        groupings = list(payload.groupings)
        selected_columns: list[ColumnElement[Any]] = []
        ordering: list[ColumnElement[Any]] = []
        totals_exprs: list[ColumnElement[Any]] = []
        result_fields: list[FieldDefinition] = []

        for column_key in payload.columns:
            field = field_map[column_key]
            expression = exprs[column_key]
            if groupings and field.kind == "metric":
                selected = func.coalesce(func.sum(expression), 0).label(column_key)
            else:
                selected = expression.label(column_key)
            selected_columns.append(selected)
            result_fields.append(field)
            if field.kind == "metric":
                totals_exprs.append(func.coalesce(func.sum(expression), 0).label(column_key))

        query = select(*selected_columns).select_from(from_clause).where(*where_clauses)
        count_query: Any
        if groupings:
            query = query.group_by(*[exprs[grouping] for grouping in groupings])
            count_query = select(func.count()).select_from(query.order_by(None).subquery())
        else:
            count_query = select(func.count()).select_from(from_clause).where(*where_clauses)

        sort_items = payload.sorting or [CustomReportSortInput(field=groupings[0] if groupings else payload.columns[0], direction="asc")]
        for sort in sort_items:
            field = field_map[sort.field]
            if groupings and field.kind == "metric":
                sort_expr = func.coalesce(func.sum(exprs[sort.field]), 0)
            else:
                sort_expr = exprs[sort.field]
            ordering.append(sort_expr.desc() if sort.direction == "desc" else sort_expr.asc())
        query = query.order_by(*ordering)
        query = query.offset((payload.page - 1) * payload.page_size).limit(payload.page_size)

        rows = []
        for row in self.db.execute(query).mappings().all():
            rows.append({key: self._serialize_value(value) for key, value in row.items()})

        total_count = int(self.db.scalar(count_query) or 0)
        total_pages = max(1, math.ceil(total_count / payload.page_size)) if total_count else 1

        totals: dict[str, Any] | None = None
        if totals_exprs:
            totals_query = select(*totals_exprs).select_from(from_clause).where(*where_clauses)
            totals_row = self.db.execute(totals_query).mappings().one()
            totals = {key: self._serialize_value(value) for key, value in totals_row.items()}

        execution_id = None
        completed_at = datetime.now(UTC)
        if persist_execution:
            execution = self.repo.create_execution(
                organization_id=organization_id,
                report_definition_id=report_definition_id,
                dataset_id=dataset.id,
                requested_by_user_id=requested_by_user_id,
                filters_json=[item.model_dump(mode="json") for item in payload.filters],
                groupings_json=payload.groupings,
                sorting_json=[item.model_dump(mode="json") for item in payload.sorting],
                columns_json=payload.columns,
            )
            self.repo.complete_execution(execution, totals_json=totals, row_count=total_count)
            execution_id = execution.id
            completed_at = execution.completed_at or completed_at
            self.audit.create(
                organization_id=organization_id,
                actor_user_id=requested_by_user_id,
                action="custom_report.executed",
                entity_type="custom_report_execution",
                entity_id=str(execution.id),
                metadata_json={"dataset_id": dataset.id, "report_definition_id": str(report_definition_id) if report_definition_id else None, "row_count": total_count},
            )
            self.db.commit()

        return CustomReportResultResponse(
            report_definition_id=report_definition_id,
            dataset=dataset.summary(),
            columns=[field.to_response() for field in result_fields],
            filters=payload.filters,
            filter_summary=self._filter_summary(payload, field_map),
            groupings=[field_map[grouping].to_response() for grouping in groupings],
            sorting=payload.sorting,
            rows=rows,
            totals=totals,
            row_count=total_count,
            page=payload.page,
            page_size=payload.page_size,
            total_pages=total_pages,
            validation_errors=[],
            execution=CustomReportExecutionMetadataResponse(
                execution_id=execution_id,
                status=ReportRunStatus.COMPLETED,
                executed_at=completed_at,
                completed_at=completed_at,
                requested_by_user_id=requested_by_user_id,
                requested_by_email=requested_by_email,
                report_definition_id=report_definition_id,
            ),
        )

    def _definition_response(self, organization_id: str, row: CustomReportDefinition, latest_execution_by_report_id: dict[UUID, Any] | None = None) -> CustomReportDefinitionResponse:
        latest_execution = latest_execution_by_report_id.get(row.id) if latest_execution_by_report_id else None
        user_email = self.db.scalar(select(User.email).where(User.id == row.created_by_user_id)) if row.created_by_user_id else None
        latest_user_email = self.db.scalar(select(User.email).where(User.id == latest_execution.requested_by_user_id)) if latest_execution and latest_execution.requested_by_user_id else None
        visibility = "private"
        if row.display_options_json and row.display_options_json.get("visibility") == "organization":
            visibility = "organization"
        validation_errors: list[str] = []
        try:
            dataset = self._get_dataset_or_404(row.dataset_id)
            for column in row.columns_json:
                if column not in self._field_map(dataset):
                    validation_errors.append(f"Unknown column '{column}'")
        except Exception:
            validation_errors.append(f"Dataset '{row.dataset_id}' is unavailable")
        return CustomReportDefinitionResponse(
            id=row.id,
            organization_id=row.organization_id,
            name=row.name,
            description=row.description,
            dataset_id=row.dataset_id,
            columns_json=row.columns_json,
            filters_json=row.filters_json,
            groupings_json=row.groupings_json,
            sorting_json=row.sorting_json,
            display_options_json=row.display_options_json,
            is_system_template=row.is_system_template,
            created_by_user_id=row.created_by_user_id,
            created_by_email=user_email,
            created_at=row.created_at,
            updated_at=row.updated_at,
            archived_at=row.archived_at,
            last_run_at=latest_execution.completed_at if latest_execution else None,
            last_run_status=latest_execution.execution_status if latest_execution else None,
            last_run_by_user_id=latest_execution.requested_by_user_id if latest_execution else None,
            last_run_by_email=latest_user_email,
            visibility=visibility,
            validation_errors=validation_errors,
        )

    def list_definitions(self, organization_id: str) -> list[CustomReportDefinitionResponse]:
        self._enforce_advanced_reporting(organization_id)
        rows = self.repo.list_definitions(organization_id)
        latest_map: dict[UUID, Any] = {}
        for execution in self.repo.list_executions_for_reports(organization_id, [row.id for row in rows]):
            if execution.report_definition_id and execution.report_definition_id not in latest_map:
                latest_map[execution.report_definition_id] = execution
        return [self._definition_response(organization_id, row, latest_map) for row in rows]

    def create_definition(self, organization_id: str, role_id: UUID, created_by_user_id: str | UUID | None, payload: CustomReportDefinitionCreate):
        self._enforce_advanced_reporting(organization_id)
        self.validate_definition(role_id, CustomReportPreviewRequest(**payload.model_dump()))
        row = self.repo.create_definition(
            organization_id=organization_id,
            name=payload.name,
            description=payload.description,
            dataset_id=payload.dataset_id,
            columns_json=payload.columns,
            filters_json=[item.model_dump(mode="json") for item in payload.filters],
            groupings_json=payload.groupings,
            sorting_json=[item.model_dump(mode="json") for item in payload.sorting],
            display_options_json=payload.display_options,
            is_system_template=False,
            created_by_user_id=created_by_user_id,
        )
        self.audit.create(
            organization_id=organization_id,
            actor_user_id=created_by_user_id,
            action="custom_report.created",
            entity_type="custom_report_definition",
            entity_id=str(row.id),
            metadata_json={"dataset_id": payload.dataset_id, "name": payload.name},
        )
        self.db.commit()
        return self._definition_response(organization_id, row)

    def get_definition(self, organization_id: str, report_id: str) -> CustomReportDefinitionResponse:
        self._enforce_advanced_reporting(organization_id)
        row = self.repo.get_definition(organization_id, report_id)
        if not row or row.archived_at:
            raise not_found("Custom report definition not found")
        return self._definition_response(organization_id, row, {row.id: self.repo.latest_execution_for_report(organization_id, row.id)} if row.id else {})

    def update_definition(self, organization_id: str, role_id: UUID, report_id: str, updated_by_user_id: str | UUID | None, payload: CustomReportDefinitionUpdate):
        self._enforce_advanced_reporting(organization_id)
        row = self.repo.get_definition(organization_id, report_id)
        if not row or row.archived_at:
            raise not_found("Custom report definition not found")
        merged = {
            "name": payload.name if payload.name is not None else row.name,
            "description": payload.description if payload.description is not None else row.description,
            "dataset_id": payload.dataset_id if payload.dataset_id is not None else row.dataset_id,
            "columns": payload.columns if payload.columns is not None else row.columns_json,
            "filters": payload.filters if payload.filters is not None else [CustomReportFilterInput(**item) for item in row.filters_json],
            "groupings": payload.groupings if payload.groupings is not None else row.groupings_json,
            "sorting": payload.sorting if payload.sorting is not None else [CustomReportSortInput(**item) for item in row.sorting_json],
            "display_options": payload.display_options if payload.display_options is not None else row.display_options_json,
        }
        self.validate_definition(role_id, CustomReportPreviewRequest(**merged))
        self.repo.update_definition(
            row,
            fields={
                "name": merged["name"],
                "description": merged["description"],
                "dataset_id": merged["dataset_id"],
                "columns_json": merged["columns"],
                "filters_json": [item.model_dump(mode="json") for item in merged["filters"]],
                "groupings_json": merged["groupings"],
                "sorting_json": [item.model_dump(mode="json") for item in merged["sorting"]],
                "display_options_json": merged["display_options"],
            },
        )
        self.audit.create(
            organization_id=organization_id,
            actor_user_id=updated_by_user_id,
            action="custom_report.updated",
            entity_type="custom_report_definition",
            entity_id=str(row.id),
            metadata_json={"dataset_id": row.dataset_id, "name": row.name},
        )
        self.db.commit()
        return self._definition_response(organization_id, row)

    def delete_definition(self, organization_id: str, report_id: str, deleted_by_user_id: str | UUID | None):
        self._enforce_advanced_reporting(organization_id)
        row = self.repo.get_definition(organization_id, report_id)
        if not row or row.archived_at:
            raise not_found("Custom report definition not found")
        self.repo.archive_definition(row)
        self.audit.create(
            organization_id=organization_id,
            actor_user_id=deleted_by_user_id,
            action="custom_report.deleted",
            entity_type="custom_report_definition",
            entity_id=str(row.id),
            metadata_json={"dataset_id": row.dataset_id, "name": row.name},
        )
        self.db.commit()

    def run_definition(self, organization_id: str, role_id: UUID, report_id: str, requested_by_user_id: str | UUID | None, requested_by_email: str | None):
        self._enforce_advanced_reporting(organization_id)
        row = self.repo.get_definition(organization_id, report_id)
        if not row or row.archived_at:
            raise not_found("Custom report definition not found")
        payload = CustomReportPreviewRequest(
            dataset_id=row.dataset_id,
            columns=row.columns_json,
            filters=[CustomReportFilterInput(**item) for item in row.filters_json],
            groupings=row.groupings_json,
            sorting=[CustomReportSortInput(**item) for item in row.sorting_json],
            page=1,
            page_size=100,
        )
        return self.execute_preview(
            organization_id=organization_id,
            role_id=role_id,
            requested_by_user_id=requested_by_user_id,
            requested_by_email=requested_by_email,
            payload=payload,
            report_definition_id=row.id,
            persist_execution=True,
        )

    def latest_results(self, organization_id: str, role_id: UUID, report_id: str, requested_by_user_id: str | UUID | None, requested_by_email: str | None):
        return self.run_definition(organization_id, role_id, report_id, requested_by_user_id, requested_by_email)

    def export_preview(self, organization_id: str, role_id: UUID, requested_by_user_id: str | UUID | None, requested_by_email: str | None, payload: CustomReportExportRequest):
        self._enforce_advanced_reporting(organization_id)
        result = self.execute_preview(
            organization_id=organization_id,
            role_id=role_id,
            requested_by_user_id=requested_by_user_id,
            requested_by_email=requested_by_email,
            payload=CustomReportPreviewRequest(**payload.model_dump(exclude={"export_format"})),
            persist_execution=True,
        )
        export_payload = {
            "metadata": {
                "report_type": ReportType.CUSTOM_REPORT.value,
                "organization_id": organization_id,
                "accounting_basis": "accrual",
            },
            "filters": {"summary": result.filter_summary},
            "dataset": result.dataset.model_dump(mode="json"),
            "columns": [column.model_dump(mode="json") for column in result.columns],
            "rows": result.rows,
            "totals": result.totals,
            "row_count": result.row_count,
        }
        return self.exporter.export(
            organization_id=organization_id,
            report_type=ReportType.CUSTOM_REPORT,
            export_format=payload.export_format,
            file_stem=f"custom-report-preview-{result.dataset.key}",
            payload=export_payload,
            generated_by_user_id=requested_by_user_id,
        )

    def export_definition(self, organization_id: str, role_id: UUID, report_id: str, requested_by_user_id: str | UUID | None, requested_by_email: str | None, payload: CustomReportExportRequest):
        self._enforce_advanced_reporting(organization_id)
        row = self.repo.get_definition(organization_id, report_id)
        if not row or row.archived_at:
            raise not_found("Custom report definition not found")
        result = self.run_definition(organization_id, role_id, report_id, requested_by_user_id, requested_by_email)
        export_payload = {
            "metadata": {
                "report_type": ReportType.CUSTOM_REPORT.value,
                "organization_id": organization_id,
                "report_definition_id": str(row.id),
                "report_name": row.name,
                "accounting_basis": "accrual",
            },
            "filters": {"summary": result.filter_summary},
            "dataset": result.dataset.model_dump(mode="json"),
            "columns": [column.model_dump(mode="json") for column in result.columns],
            "rows": result.rows,
            "totals": result.totals,
            "row_count": result.row_count,
        }
        return self.exporter.export(
            organization_id=organization_id,
            report_type=ReportType.CUSTOM_REPORT,
            export_format=payload.export_format,
            file_stem=f"custom-report-{row.name.lower().replace(' ', '-')}",
            payload=export_payload,
            generated_by_user_id=requested_by_user_id,
        )
