from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_, case, func, inspect, select
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.enums import BankTransactionStatus, BillStatus, IntegrationConnectionStatus, InvoiceStatus, SubscriptionStatus
from app.db.models.ap import Bill
from app.db.models.ar import Invoice
from app.db.models.audit import AuditLog
from app.db.models.banking import BankAccount, BankTransaction
from app.db.models.billing import BillingAccount, Subscription
from app.db.models.integrations import IntegrationConnection
from app.db.models.onboarding import OrgOnboardingStatus
from app.schemas.dashboard import (
    DashboardActivityItem,
    DashboardAgingBucket,
    DashboardAttentionItem,
    DashboardMetric,
    DashboardOverviewResponse,
    DashboardRecommendation,
    DashboardTrendPoint,
    DashboardWorkflowStatus,
)

UTC = timezone.utc


@dataclass
class _Exposure:
    open_amount: Decimal
    overdue_amount: Decimal
    open_count: int
    overdue_count: int


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self._inspector = inspect(self.db.bind)

    def _has_table(self, table_name: str) -> bool:
        try:
            return self._inspector.has_table(table_name)
        except SQLAlchemyError:
            return False

    def overview(self, organization_id: str) -> DashboardOverviewResponse:
        try:
            org_uuid = UUID(organization_id)
            today = date.today()
            month_start = today.replace(day=1)

            receivables = self._invoice_exposure(org_uuid, today)
            payables = self._bill_exposure(org_uuid, today)
            cash_balance, month_cash_movement = self._cash_metrics(org_uuid, month_start)
            month_revenue, month_expenses = self._month_profitability(org_uuid, month_start)
            onboarding = None
            if self._has_table("org_onboarding_status"):
                try:
                    onboarding = self.db.scalar(select(OrgOnboardingStatus).where(OrgOnboardingStatus.organization_id == org_uuid))
                except SQLAlchemyError:
                    onboarding = None

            summary_metrics = [
                DashboardMetric(key="cash_balance", label="Cash position", value=float(cash_balance), route="/banking", currency_code="USD", delta=float(month_cash_movement)),
                DashboardMetric(key="receivables", label="Receivables outstanding", value=float(receivables.open_amount), route="/invoices", currency_code="USD", delta=float(receivables.overdue_amount)),
                DashboardMetric(key="payables", label="Payables outstanding", value=float(payables.open_amount), route="/bills", currency_code="USD", delta=float(payables.overdue_amount)),
                DashboardMetric(key="month_revenue", label="Revenue this month", value=float(month_revenue), route="/reports/profit-loss", currency_code="USD"),
                DashboardMetric(key="month_expenses", label="Expenses this month", value=float(month_expenses), route="/reports/profit-loss", currency_code="USD"),
                DashboardMetric(key="month_net", label="Net result this month", value=float(month_revenue - month_expenses), route="/reports/profit-loss", currency_code="USD"),
            ]

            attention_items = self._attention_items(
                organization_id=organization_id,
                receivables=receivables,
                payables=payables,
                today=today,
                onboarding=onboarding,
            )

            trends = self._trend_series(org_uuid, months=6)
            aging = self._aging_buckets(org_uuid, today)
            workflows = self._workflow_status(org_uuid)
            recent_activity = self._recent_activity(org_uuid)
            maturity = self._maturity(onboarding, receivables, payables, recent_activity)
            recommendations = self._recommendations(maturity, receivables, payables, attention_items)

            return DashboardOverviewResponse(
                maturity=maturity,
                summary_metrics=summary_metrics,
                attention_items=attention_items,
                trends=trends,
                aging=aging,
                workflows=workflows,
                recent_activity=recent_activity,
                recommendations=recommendations,
            )
        except (ValueError, SQLAlchemyError, AttributeError):
            return self._fallback_overview()

    def _fallback_overview(self) -> DashboardOverviewResponse:
        return DashboardOverviewResponse(
            maturity="new",
            summary_metrics=[
                DashboardMetric(key="cash_balance", label="Cash position", value=0, route="/banking", currency_code="USD", delta=0),
                DashboardMetric(key="receivables", label="Receivables outstanding", value=0, route="/invoices", currency_code="USD", delta=0),
                DashboardMetric(key="payables", label="Payables outstanding", value=0, route="/bills", currency_code="USD", delta=0),
                DashboardMetric(key="month_revenue", label="Revenue this month", value=0, route="/reports/profit-loss", currency_code="USD"),
                DashboardMetric(key="month_expenses", label="Expenses this month", value=0, route="/reports/profit-loss", currency_code="USD"),
                DashboardMetric(key="month_net", label="Net result this month", value=0, route="/reports/profit-loss", currency_code="USD"),
            ],
            attention_items=[],
            trends=[],
            aging=[],
            workflows=[],
            recent_activity=[],
            recommendations=[
                DashboardRecommendation(
                    key="continue_setup",
                    title="Continue setup",
                    description="Dashboard data will populate as your organization configuration and activity grow.",
                    route="/setup",
                    priority="medium",
                )
            ],
        )

    def _invoice_exposure(self, organization_id: UUID, today: date) -> _Exposure:
        row = self.db.execute(
            select(
                func.coalesce(func.sum(case((and_(Invoice.deleted_at.is_(None), Invoice.amount_due > 0), Invoice.amount_due), else_=0)), 0),
                func.coalesce(func.sum(case((and_(Invoice.deleted_at.is_(None), Invoice.amount_due > 0, Invoice.due_date < today), Invoice.amount_due), else_=0)), 0),
                func.coalesce(func.sum(case((and_(Invoice.deleted_at.is_(None), Invoice.amount_due > 0), 1), else_=0)), 0),
                func.coalesce(func.sum(case((and_(Invoice.deleted_at.is_(None), Invoice.amount_due > 0, Invoice.due_date < today), 1), else_=0)), 0),
            ).where(Invoice.organization_id == organization_id)
        ).one()
        return _Exposure(open_amount=row[0] or Decimal("0"), overdue_amount=row[1] or Decimal("0"), open_count=int(row[2] or 0), overdue_count=int(row[3] or 0))

    def _bill_exposure(self, organization_id: UUID, today: date) -> _Exposure:
        row = self.db.execute(
            select(
                func.coalesce(func.sum(case((and_(Bill.deleted_at.is_(None), Bill.amount_due > 0), Bill.amount_due), else_=0)), 0),
                func.coalesce(func.sum(case((and_(Bill.deleted_at.is_(None), Bill.amount_due > 0, Bill.due_date < today), Bill.amount_due), else_=0)), 0),
                func.coalesce(func.sum(case((and_(Bill.deleted_at.is_(None), Bill.amount_due > 0), 1), else_=0)), 0),
                func.coalesce(func.sum(case((and_(Bill.deleted_at.is_(None), Bill.amount_due > 0, Bill.due_date < today), 1), else_=0)), 0),
            ).where(Bill.organization_id == organization_id)
        ).one()
        return _Exposure(open_amount=row[0] or Decimal("0"), overdue_amount=row[1] or Decimal("0"), open_count=int(row[2] or 0), overdue_count=int(row[3] or 0))

    def _cash_metrics(self, organization_id: UUID, month_start: date) -> tuple[Decimal, Decimal]:
        opening_balance = self.db.scalar(
            select(func.coalesce(func.sum(BankAccount.opening_balance), 0)).where(BankAccount.organization_id == organization_id, BankAccount.deleted_at.is_(None), BankAccount.is_active.is_(True))
        ) or Decimal("0")
        txns_total = self.db.scalar(
            select(func.coalesce(func.sum(BankTransaction.amount), 0)).where(BankTransaction.organization_id == organization_id, BankTransaction.deleted_at.is_(None))
        ) or Decimal("0")
        month_movement = self.db.scalar(
            select(func.coalesce(func.sum(BankTransaction.amount), 0)).where(BankTransaction.organization_id == organization_id, BankTransaction.deleted_at.is_(None), BankTransaction.transaction_date >= month_start)
        ) or Decimal("0")
        return opening_balance + txns_total, month_movement

    def _month_profitability(self, organization_id: UUID, month_start: date) -> tuple[Decimal, Decimal]:
        revenue = self.db.scalar(
            select(func.coalesce(func.sum(Invoice.total_amount), 0)).where(
                Invoice.organization_id == organization_id,
                Invoice.deleted_at.is_(None),
                Invoice.issue_date >= month_start,
                Invoice.status.in_([InvoiceStatus.APPROVED, InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.SENT, InvoiceStatus.OVERDUE]),
            )
        ) or Decimal("0")
        expenses = self.db.scalar(
            select(func.coalesce(func.sum(Bill.total_amount), 0)).where(
                Bill.organization_id == organization_id,
                Bill.deleted_at.is_(None),
                Bill.issue_date >= month_start,
                Bill.status.in_([BillStatus.POSTED, BillStatus.PAID, BillStatus.PARTIALLY_PAID, BillStatus.APPROVED, BillStatus.OVERDUE]),
            )
        ) or Decimal("0")
        return revenue, expenses

    def _attention_items(
        self,
        *,
        organization_id: str,
        receivables: _Exposure,
        payables: _Exposure,
        today: date,
        onboarding: OrgOnboardingStatus | None,
    ) -> list[DashboardAttentionItem]:
        org_uuid = UUID(organization_id)
        attention: list[DashboardAttentionItem] = []
        if receivables.overdue_count > 0:
            attention.append(
                DashboardAttentionItem(
                    key="overdue_invoices",
                    title="Overdue invoices need follow-up",
                    detail=f"{receivables.overdue_count} invoices are overdue.",
                    severity="high",
                    route="/invoices",
                    count=receivables.overdue_count,
                    amount=float(receivables.overdue_amount),
                    currency_code="USD",
                )
            )
        if payables.overdue_count > 0:
            attention.append(
                DashboardAttentionItem(
                    key="overdue_bills",
                    title="Overdue bills need scheduling",
                    detail=f"{payables.overdue_count} bills are overdue.",
                    severity="high",
                    route="/bills",
                    count=payables.overdue_count,
                    amount=float(payables.overdue_amount),
                    currency_code="USD",
                )
            )

        unreconciled_count = self.db.scalar(
            select(func.count(BankTransaction.id)).where(
                BankTransaction.organization_id == org_uuid,
                BankTransaction.deleted_at.is_(None),
                BankTransaction.status == BankTransactionStatus.UNRECONCILED,
            )
        ) or 0
        if unreconciled_count:
            attention.append(
                DashboardAttentionItem(
                    key="unreconciled_transactions",
                    title="Bank reconciliation queue",
                    detail=f"{unreconciled_count} bank transactions are unreconciled.",
                    severity="medium",
                    route="/banking/reconciliations",
                    count=int(unreconciled_count),
                )
            )

        failed_syncs = 0
        if self._has_table("integration_connections"):
            try:
                failed_syncs = self.db.scalar(
                    select(func.count(IntegrationConnection.id)).where(
                        IntegrationConnection.organization_id == org_uuid,
                        IntegrationConnection.deleted_at.is_(None),
                        IntegrationConnection.status.in_([IntegrationConnectionStatus.FAILED, IntegrationConnectionStatus.DEGRADED, IntegrationConnectionStatus.REQUIRES_REAUTH]),
                    )
                ) or 0
            except SQLAlchemyError:
                failed_syncs = 0
        if failed_syncs:
            attention.append(
                DashboardAttentionItem(
                    key="integrations_attention",
                    title="Integration health needs review",
                    detail=f"{failed_syncs} integration connections are degraded or failed.",
                    severity="medium",
                    route="/integrations",
                    count=int(failed_syncs),
                )
            )

        trial_ending = 0
        if self._has_table("billing_accounts") and self._has_table("subscriptions"):
            try:
                trial_ending = self.db.scalar(
                    select(func.count(Subscription.id))
                    .select_from(Subscription)
                    .join(BillingAccount, BillingAccount.id == Subscription.billing_account_id)
                    .where(
                        BillingAccount.organization_id == org_uuid,
                        Subscription.status == SubscriptionStatus.TRIALING,
                        Subscription.trial_end_at.is_not(None),
                        Subscription.trial_end_at <= (today.replace(day=min(today.day + 7, 28)).isoformat()),
                    )
                ) or 0
            except SQLAlchemyError:
                trial_ending = 0
        if trial_ending:
            attention.append(
                DashboardAttentionItem(
                    key="trial_ending",
                    title="Trial ends soon",
                    detail="Billing trial window is close to expiration.",
                    severity="low",
                    route="/settings/billing",
                    count=int(trial_ending),
                )
            )

        if onboarding and onboarding.completion_tier < 2:
            attention.append(
                DashboardAttentionItem(
                    key="onboarding",
                    title="Setup is incomplete",
                    detail="Finish onboarding to unlock a full operational dashboard.",
                    severity="medium",
                    route="/setup",
                )
            )

        severity_rank = {"high": 0, "medium": 1, "low": 2}
        attention.sort(key=lambda item: severity_rank.get(item.severity, 3))
        return attention[:8]

    def _trend_series(self, organization_id: UUID, *, months: int) -> list[DashboardTrendPoint]:
        points: list[DashboardTrendPoint] = []
        today = date.today()
        for offset in range(months - 1, -1, -1):
            month_start = date(today.year, today.month, 1)
            shifted = (month_start.month - offset - 1)
            year = month_start.year + shifted // 12
            month = shifted % 12 + 1
            bucket_start = date(year, month, 1)
            next_month = date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)
            revenue = self.db.scalar(
                select(func.coalesce(func.sum(Invoice.total_amount), 0)).where(
                    Invoice.organization_id == organization_id,
                    Invoice.deleted_at.is_(None),
                    Invoice.issue_date >= bucket_start,
                    Invoice.issue_date < next_month,
                )
            ) or Decimal("0")
            expenses = self.db.scalar(
                select(func.coalesce(func.sum(Bill.total_amount), 0)).where(
                    Bill.organization_id == organization_id,
                    Bill.deleted_at.is_(None),
                    Bill.issue_date >= bucket_start,
                    Bill.issue_date < next_month,
                )
            ) or Decimal("0")
            cash_movement = self.db.scalar(
                select(func.coalesce(func.sum(BankTransaction.amount), 0)).where(
                    BankTransaction.organization_id == organization_id,
                    BankTransaction.deleted_at.is_(None),
                    BankTransaction.transaction_date >= bucket_start,
                    BankTransaction.transaction_date < next_month,
                )
            ) or Decimal("0")
            points.append(
                DashboardTrendPoint(
                    label=bucket_start.strftime("%b"),
                    revenue=float(revenue),
                    expenses=float(expenses),
                    cash_movement=float(cash_movement),
                )
            )
        return points

    def _aging_buckets(self, organization_id: UUID, today: date) -> list[DashboardAgingBucket]:
        definitions = [
            ("current", 0, 0),
            ("1-30", 1, 30),
            ("31-60", 31, 60),
            ("61-90", 61, 90),
            ("90+", 91, None),
        ]

        receivable_rows = self.db.execute(
            select(Invoice.due_date, Invoice.amount_due).where(Invoice.organization_id == organization_id, Invoice.deleted_at.is_(None), Invoice.amount_due > 0)
        ).all()
        payable_rows = self.db.execute(
            select(Bill.due_date, Bill.amount_due).where(Bill.organization_id == organization_id, Bill.deleted_at.is_(None), Bill.amount_due > 0)
        ).all()

        receivables = defaultdict(lambda: Decimal("0"))
        payables = defaultdict(lambda: Decimal("0"))

        def bucket_for_due(due_date: date) -> str:
            days_overdue = (today - due_date).days
            if days_overdue <= 0:
                return "current"
            if days_overdue <= 30:
                return "1-30"
            if days_overdue <= 60:
                return "31-60"
            if days_overdue <= 90:
                return "61-90"
            return "90+"

        for due_date, amount in receivable_rows:
            receivables[bucket_for_due(due_date)] += amount or Decimal("0")
        for due_date, amount in payable_rows:
            payables[bucket_for_due(due_date)] += amount or Decimal("0")

        return [
            DashboardAgingBucket(
                bucket=label,
                receivables=float(receivables[label]),
                payables=float(payables[label]),
            )
            for label, _, _ in definitions
        ]

    def _workflow_status(self, organization_id: UUID) -> list[DashboardWorkflowStatus]:
        invoice_counts = self.db.execute(
            select(Invoice.status, func.count(Invoice.id)).where(Invoice.organization_id == organization_id, Invoice.deleted_at.is_(None)).group_by(Invoice.status)
        ).all()
        bill_counts = self.db.execute(
            select(Bill.status, func.count(Bill.id)).where(Bill.organization_id == organization_id, Bill.deleted_at.is_(None)).group_by(Bill.status)
        ).all()
        inv_map = {str(status): count for status, count in invoice_counts}
        bill_map = {str(status): count for status, count in bill_counts}

        unreconciled = self.db.scalar(
            select(func.count(BankTransaction.id)).where(
                BankTransaction.organization_id == organization_id,
                BankTransaction.deleted_at.is_(None),
                BankTransaction.status == BankTransactionStatus.UNRECONCILED,
            )
        ) or 0

        return [
            DashboardWorkflowStatus(
                key="invoices",
                label="Invoices",
                draft=int(inv_map.get(InvoiceStatus.DRAFT.value, 0)),
                in_progress=int(inv_map.get(InvoiceStatus.SENT.value, 0) + inv_map.get(InvoiceStatus.APPROVED.value, 0) + inv_map.get(InvoiceStatus.PARTIALLY_PAID.value, 0)),
                overdue=int(inv_map.get(InvoiceStatus.OVERDUE.value, 0)),
                completed=int(inv_map.get(InvoiceStatus.PAID.value, 0)),
                route="/invoices",
            ),
            DashboardWorkflowStatus(
                key="bills",
                label="Bills",
                draft=int(bill_map.get(BillStatus.DRAFT.value, 0)),
                in_progress=int(bill_map.get(BillStatus.APPROVED.value, 0) + bill_map.get(BillStatus.PARTIALLY_PAID.value, 0)),
                overdue=int(bill_map.get(BillStatus.OVERDUE.value, 0)),
                completed=int(bill_map.get(BillStatus.PAID.value, 0)),
                route="/bills",
            ),
            DashboardWorkflowStatus(
                key="reconciliation",
                label="Bank reconciliation",
                draft=0,
                in_progress=int(unreconciled),
                overdue=0,
                completed=0,
                route="/banking/reconciliations",
            ),
        ]

    def _recent_activity(self, organization_id: UUID) -> list[DashboardActivityItem]:
        rows = self.db.execute(
            select(AuditLog)
            .where(AuditLog.organization_id == organization_id)
            .order_by(AuditLog.created_at.desc())
            .limit(8)
        ).scalars().all()
        return [
            DashboardActivityItem(
                id=str(row.id),
                action=row.action,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                created_at=row.created_at.isoformat(),
            )
            for row in rows
        ]

    def _maturity(self, onboarding: OrgOnboardingStatus | None, receivables: _Exposure, payables: _Exposure, activity: list[DashboardActivityItem]) -> str:
        if onboarding and onboarding.completion_tier >= 3:
            return "mature"
        if receivables.open_count + payables.open_count + len(activity) > 8:
            return "active"
        return "new"

    def _recommendations(
        self,
        maturity: str,
        receivables: _Exposure,
        payables: _Exposure,
        attention_items: list[DashboardAttentionItem],
    ) -> list[DashboardRecommendation]:
        recommendations: list[DashboardRecommendation] = []

        if maturity == "new":
            recommendations.append(
                DashboardRecommendation(
                    key="continue_setup",
                    title="Complete initial setup",
                    description="Finish core setup and accounting defaults before daily operations.",
                    route="/setup",
                    priority="high",
                )
            )
            recommendations.append(
                DashboardRecommendation(
                    key="create_first_invoice",
                    title="Create your first invoice",
                    description="Start your AR cycle and verify invoice templates and payment flow.",
                    route="/invoices/new",
                    priority="medium",
                )
            )

        if receivables.overdue_count > 0:
            recommendations.append(
                DashboardRecommendation(
                    key="collect_overdue",
                    title="Follow up overdue receivables",
                    description="Prioritize collection workflow for overdue invoices.",
                    route="/invoices",
                    priority="high",
                )
            )
        if payables.overdue_count > 0:
            recommendations.append(
                DashboardRecommendation(
                    key="schedule_payables",
                    title="Resolve overdue payables",
                    description="Schedule supplier payments and clear overdue AP balances.",
                    route="/bills",
                    priority="high",
                )
            )
        if any(item.key == "unreconciled_transactions" for item in attention_items):
            recommendations.append(
                DashboardRecommendation(
                    key="reconcile_bank",
                    title="Reconcile imported bank transactions",
                    description="Process unreconciled transactions to keep cash and books aligned.",
                    route="/banking/reconciliations",
                    priority="medium",
                )
            )

        recommendations.append(
            DashboardRecommendation(
                key="run_pl",
                title="Review current P&L",
                description="Validate month-to-date performance and investigate notable swings.",
                route="/reports/profit-loss",
                priority="low",
            )
        )

        return recommendations[:5]
