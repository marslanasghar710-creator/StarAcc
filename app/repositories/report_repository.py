from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Iterable
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.core.enums import AccountType, JournalStatus, ReportExportFormat, ReportRunStatus, ReportType
from app.db.models import (
    Account,
    Bill,
    CreditNote,
    Customer,
    CustomerPayment,
    Invoice,
    JournalEntry,
    JournalLine,
    Organization,
    ReportExport,
    ReportRun,
    Supplier,
    SupplierCredit,
    SupplierPayment,
)

UTC = timezone.utc
ZERO = Decimal("0")


@dataclass(slots=True)
class ReportLedgerRow:
    account: Account
    journal_entry: JournalEntry
    journal_line: JournalLine


class ReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_organization(self, organization_id: str | UUID) -> Organization | None:
        return self.db.scalar(select(Organization).where(Organization.id == organization_id, Organization.deleted_at.is_(None)))

    def list_accounts(self, organization_id: str | UUID, account_types: Iterable[AccountType] | None = None) -> list[Account]:
        query = select(Account).where(Account.organization_id == organization_id, Account.deleted_at.is_(None)).order_by(Account.code)
        if account_types:
            query = query.where(Account.account_type.in_(tuple(account_types)))
        return list(self.db.scalars(query).all())

    def _posted_lines_query(self, organization_id: str | UUID) -> Select:
        return (
            select(Account, JournalEntry, JournalLine)
            .join(JournalLine, JournalLine.account_id == Account.id)
            .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
            .where(
                Account.organization_id == organization_id,
                Account.deleted_at.is_(None),
                JournalLine.organization_id == organization_id,
                JournalEntry.organization_id == organization_id,
                JournalEntry.status == JournalStatus.POSTED,
            )
        )

    def fetch_general_ledger_rows(
        self,
        organization_id: str | UUID,
        from_date: date,
        to_date: date,
        account_id: str | UUID | None = None,
        source_module: str | None = None,
    ) -> list[ReportLedgerRow]:
        query = self._posted_lines_query(organization_id).where(
            JournalEntry.entry_date >= from_date,
            JournalEntry.entry_date <= to_date,
        )
        if account_id:
            query = query.where(Account.id == account_id)
        if source_module:
            query = query.where(JournalEntry.source_module == source_module)
        query = query.order_by(Account.code, JournalEntry.entry_date, JournalEntry.entry_number, JournalLine.line_number, JournalLine.id)
        return [ReportLedgerRow(account=account, journal_entry=entry, journal_line=line) for account, entry, line in self.db.execute(query).all()]

    def aggregate_account_activity(
        self,
        organization_id: str | UUID,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        as_of_date: date | None = None,
        account_types: Iterable[AccountType] | None = None,
    ) -> list[dict]:
        query = (
            select(
                Account.id.label("account_id"),
                Account.code.label("code"),
                Account.name.label("name"),
                Account.account_type.label("account_type"),
                Account.normal_balance.label("normal_balance"),
                func.coalesce(func.sum(JournalLine.base_debit_amount), 0).label("debit_total"),
                func.coalesce(func.sum(JournalLine.base_credit_amount), 0).label("credit_total"),
            )
            .select_from(Account)
            .join(JournalLine, JournalLine.account_id == Account.id)
            .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
            .where(
                Account.organization_id == organization_id,
                Account.deleted_at.is_(None),
                JournalLine.organization_id == organization_id,
                JournalEntry.organization_id == organization_id,
                JournalEntry.status == JournalStatus.POSTED,
            )
            .group_by(Account.id, Account.code, Account.name, Account.account_type, Account.normal_balance)
            .order_by(Account.code)
        )
        if account_types:
            query = query.where(Account.account_type.in_(tuple(account_types)))
        if from_date is not None:
            query = query.where(JournalEntry.entry_date >= from_date)
        if to_date is not None:
            query = query.where(JournalEntry.entry_date <= to_date)
        if as_of_date is not None:
            query = query.where(JournalEntry.entry_date <= as_of_date)
        rows = []
        for row in self.db.execute(query).all():
            rows.append(
                {
                    "account_id": row.account_id,
                    "code": row.code,
                    "name": row.name,
                    "account_type": row.account_type,
                    "normal_balance": row.normal_balance,
                    "debit_total": Decimal(row.debit_total),
                    "credit_total": Decimal(row.credit_total),
                }
            )
        return rows

    def opening_net_movement(self, organization_id: str | UUID, account_id: str | UUID, before_date: date) -> Decimal:
        query = (
            select(
                func.coalesce(func.sum(JournalLine.base_debit_amount), 0).label("debit_total"),
                func.coalesce(func.sum(JournalLine.base_credit_amount), 0).label("credit_total"),
            )
            .select_from(JournalLine)
            .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
            .where(
                JournalLine.organization_id == organization_id,
                JournalLine.account_id == account_id,
                JournalEntry.organization_id == organization_id,
                JournalEntry.status == JournalStatus.POSTED,
                JournalEntry.entry_date < before_date,
            )
        )
        row = self.db.execute(query).one()
        return Decimal(row.debit_total) - Decimal(row.credit_total)

    def list_open_receivable_documents(self, organization_id: str | UUID, as_of_date: date):
        invoices = list(
            self.db.execute(
                select(Invoice, Customer)
                .join(Customer, Customer.id == Invoice.customer_id)
                .where(
                    Invoice.organization_id == organization_id,
                    Invoice.posted_journal_id.is_not(None),
                    Invoice.issue_date <= as_of_date,
                    Invoice.amount_due > 0,
                )
                .order_by(Customer.display_name, Invoice.due_date, Invoice.invoice_number)
            ).all()
        )
        credits = list(
            self.db.execute(
                select(CreditNote, Customer)
                .join(Customer, Customer.id == CreditNote.customer_id)
                .where(
                    CreditNote.organization_id == organization_id,
                    CreditNote.posted_journal_id.is_not(None),
                    CreditNote.issue_date <= as_of_date,
                    CreditNote.unapplied_amount > 0,
                )
                .order_by(Customer.display_name, CreditNote.issue_date, CreditNote.credit_note_number)
            ).all()
        )
        payments = list(
            self.db.execute(
                select(CustomerPayment, Customer)
                .join(Customer, Customer.id == CustomerPayment.customer_id)
                .where(
                    CustomerPayment.organization_id == organization_id,
                    CustomerPayment.posted_journal_id.is_not(None),
                    CustomerPayment.payment_date <= as_of_date,
                    CustomerPayment.unapplied_amount > 0,
                )
                .order_by(Customer.display_name, CustomerPayment.payment_date, CustomerPayment.payment_number)
            ).all()
        )
        return invoices, credits, payments

    def list_open_payable_documents(self, organization_id: str | UUID, as_of_date: date):
        bills = list(
            self.db.execute(
                select(Bill, Supplier)
                .join(Supplier, Supplier.id == Bill.supplier_id)
                .where(
                    Bill.organization_id == organization_id,
                    Bill.posted_journal_id.is_not(None),
                    Bill.issue_date <= as_of_date,
                    Bill.amount_due > 0,
                )
                .order_by(Supplier.display_name, Bill.due_date, Bill.bill_number)
            ).all()
        )
        credits = list(
            self.db.execute(
                select(SupplierCredit, Supplier)
                .join(Supplier, Supplier.id == SupplierCredit.supplier_id)
                .where(
                    SupplierCredit.organization_id == organization_id,
                    SupplierCredit.posted_journal_id.is_not(None),
                    SupplierCredit.issue_date <= as_of_date,
                    SupplierCredit.unapplied_amount > 0,
                )
                .order_by(Supplier.display_name, SupplierCredit.issue_date, SupplierCredit.supplier_credit_number)
            ).all()
        )
        payments = list(
            self.db.execute(
                select(SupplierPayment, Supplier)
                .join(Supplier, Supplier.id == SupplierPayment.supplier_id)
                .where(
                    SupplierPayment.organization_id == organization_id,
                    SupplierPayment.posted_journal_id.is_not(None),
                    SupplierPayment.payment_date <= as_of_date,
                    SupplierPayment.unapplied_amount > 0,
                )
                .order_by(Supplier.display_name, SupplierPayment.payment_date, SupplierPayment.payment_number)
            ).all()
        )
        return bills, credits, payments

    def create_report_run(
        self,
        *,
        organization_id: str | UUID,
        report_type: ReportType,
        parameters_json: dict,
        generated_by_user_id: str | UUID | None,
        status: ReportRunStatus,
        row_count: int | None = None,
        export_format: ReportExportFormat | None = None,
    ) -> ReportRun:
        report_run = ReportRun(
            organization_id=organization_id,
            report_type=report_type,
            parameters_json=parameters_json,
            generated_by_user_id=generated_by_user_id,
            generated_at=datetime.now(UTC),
            status=status,
            row_count=row_count,
            export_format=export_format,
        )
        self.db.add(report_run)
        self.db.flush()
        return report_run

    def list_report_runs(self, organization_id: str | UUID) -> list[ReportRun]:
        query = select(ReportRun).where(ReportRun.organization_id == organization_id).order_by(ReportRun.generated_at.desc())
        return list(self.db.scalars(query).all())

    def get_report_run(self, organization_id: str | UUID, report_run_id: str | UUID) -> ReportRun | None:
        return self.db.scalar(select(ReportRun).where(ReportRun.organization_id == organization_id, ReportRun.id == report_run_id))
