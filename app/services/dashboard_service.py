from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_, case, func, inspect, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.enums import BankTransactionStatus, BillStatus, IntegrationConnectionStatus, InvoiceStatus, SubscriptionStatus
from app.db.models.ap import Bill
from app.db.models.ar import Invoice
from app.db.models.audit import AuditLog
from app.db.models.banking import BankAccount, BankTransaction
from app.db.models.billing import BillingAccount, Subscription
from app.db.models.integrations import IntegrationConnection
from app.db.models.onboarding import OrgOnboardingStatus
from app.db.models.organization import Organization
from app.schemas.dashboard import (
    DashboardContext,
    DashboardDrilldownTarget,
    DashboardEmptyState,
    DashboardMoneyValue,
    DashboardOverviewResponse,
    DashboardSummary,
    DashboardWidgetEnvelope,
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

    def _money(self, amount: Decimal | float | int | str, currency: str) -> DashboardMoneyValue:
        value = Decimal(str(amount))
        symbol = "$" if currency == "USD" else f"{currency} "
        return DashboardMoneyValue(amount=f"{value:.2f}", formatted=f"{symbol}{value:,.2f}")

    def overview(self, organization_id: str) -> DashboardOverviewResponse:
        try:
            return self._build_overview(organization_id)
        except Exception:
            return self._fallback_overview(organization_id)

    def _build_overview(self, organization_id: str) -> DashboardOverviewResponse:
        org_uuid = UUID(organization_id)
        today = date.today()
        month_start = today.replace(day=1)
        generated_at = datetime.now(UTC).isoformat()

        organization = self.db.scalar(select(Organization).where(Organization.id == org_uuid))
        scope_label = organization.name if organization else "Organization"
        currency = organization.base_currency if organization else "USD"
        timezone_name = organization.timezone if organization else "UTC"

        receivables = self._invoice_exposure(org_uuid, today)
        payables = self._bill_exposure(org_uuid, today)
        cash_balance, month_cash_movement = self._cash_metrics(org_uuid, month_start)
        month_revenue, month_expenses = self._month_profitability(org_uuid, month_start)
        onboarding = self._onboarding_status(org_uuid)

        trends = self._trend_series(org_uuid, months=6, currency=currency)
        aging = self._aging_payload(org_uuid, today, currency)
        workflow_invoice, workflow_bill = self._workflow_payload(org_uuid, currency)
        recent_activity = self._recent_activity_payload(org_uuid)
        recommendations = self._recommendations_payload(receivables, payables)
        attention = self._attention_payload(org_uuid, receivables, payables, onboarding, today, currency)

        maturity = self._maturity(onboarding, receivables, payables)

        widgets: list[DashboardWidgetEnvelope] = [
            self._summary_widget("cash_position_summary", "Cash Position", self._cash_payload(cash_balance, month_cash_movement, currency), "/banking"),
            self._summary_widget("receivables_outstanding_summary", "Receivables Outstanding", self._receivable_payload(receivables, currency), "/invoices"),
            self._summary_widget("payables_outstanding_summary", "Payables Outstanding", self._payable_payload(payables, currency), "/bills"),
            self._summary_widget("revenue_this_month_summary", "Revenue This Month", self._period_amount_payload(month_revenue, month_start, today, currency), "/reports/profit-loss"),
            self._summary_widget("expenses_this_month_summary", "Expenses This Month", self._period_amount_payload(month_expenses, month_start, today, currency), "/reports/profit-loss"),
            self._summary_widget("net_result_this_month_summary", "Net Result This Month", self._net_payload(month_revenue - month_expenses, month_start, today, currency), "/reports/profit-loss"),
            attention,
            DashboardWidgetEnvelope(
                widgetKey="revenue_vs_expenses_trend",
                title="Revenue vs Expenses",
                subtitle="Recent monthly trend",
                status="ok" if trends else "empty",
                priority="medium",
                sizeHint="large",
                applicable=True,
                drilldownTarget=DashboardDrilldownTarget(route="/reports/profit-loss", label="Open P&L"),
                refreshedAt=generated_at,
                payload={"currency": currency, "periodMode": "monthly", "periods": trends, "defaultRange": "6m", "supportedRanges": ["3m", "6m", "12m"]} if trends else None,
                emptyState=None if trends else DashboardEmptyState(kind="no_data", title="No trend data yet", description="Post transactions to unlock trend analytics."),
            ),
            DashboardWidgetEnvelope(
                widgetKey="aging_distribution",
                title="AR/AP Aging Distribution",
                status="ok" if aging else "empty",
                sizeHint="medium",
                applicable=True,
                drilldownTarget=DashboardDrilldownTarget(route="/reports", label="Open aging reports"),
                refreshedAt=generated_at,
                payload={"currency": currency, "mode": "combined_split", "buckets": aging} if aging else None,
                emptyState=None if aging else DashboardEmptyState(kind="healthy_empty", title="No aging exposure", description="No outstanding AR/AP aging balances."),
            ),
            workflow_invoice,
            workflow_bill,
            DashboardWidgetEnvelope(
                widgetKey="recent_activity",
                title="Recent Activity",
                status="ok" if recent_activity else "empty",
                sizeHint="medium",
                applicable=True,
                drilldownTarget=DashboardDrilldownTarget(route="/activity", label="View activity center"),
                refreshedAt=generated_at,
                payload={"items": recent_activity} if recent_activity else None,
                emptyState=None if recent_activity else DashboardEmptyState(kind="no_data", title="No recent activity", description="Activity will appear after workflow actions."),
            ),
            DashboardWidgetEnvelope(
                widgetKey="recommended_next_actions",
                title="Recommended Next Actions",
                status="ok" if recommendations else "empty",
                sizeHint="medium",
                applicable=True,
                refreshedAt=generated_at,
                payload={"items": recommendations} if recommendations else None,
                emptyState=None if recommendations else DashboardEmptyState(kind="healthy_empty", title="No recommendations right now", description="You're in a healthy operational state."),
            ),
            self._onboarding_widget(onboarding, maturity),
            self._billing_widget(org_uuid, currency),
            self._integration_health_widget(org_uuid),
        ]

        return DashboardOverviewResponse(
            organizationId=organization_id,
            dashboardContext=DashboardContext(
                scopeType="organization",
                scopeId=organization_id,
                scopeLabel=scope_label,
                periodLabel=today.strftime("%B %Y"),
                maturityState=maturity,
                roleProfile="mixed",
                isDemo=bool(organization.is_demo) if organization else False,
            ),
            summary=DashboardSummary(generatedAt=generated_at, currency=currency, timezone=timezone_name),
            widgets=widgets,
        )

    def _summary_widget(self, key: str, title: str, payload: dict, route: str) -> DashboardWidgetEnvelope:
        return DashboardWidgetEnvelope(
            widgetKey=key,
            title=title,
            status="ok",
            priority="high",
            sizeHint="small",
            applicable=True,
            drilldownTarget=DashboardDrilldownTarget(route=route, label="Open detail"),
            payload=payload,
        )

    def _fallback_overview(self, organization_id: str) -> DashboardOverviewResponse:
        now = datetime.now(UTC).isoformat()
        return DashboardOverviewResponse(
            organizationId=organization_id,
            dashboardContext=DashboardContext(
                scopeType="organization",
                scopeId=organization_id,
                scopeLabel="Organization",
                periodLabel=date.today().strftime("%B %Y"),
                maturityState="new",
                roleProfile="mixed",
                isDemo=False,
            ),
            summary=DashboardSummary(generatedAt=now, currency="USD", timezone="UTC"),
            widgets=[
                DashboardWidgetEnvelope(
                    widgetKey="onboarding_progress",
                    title="Onboarding Progress",
                    status="warning",
                    priority="high",
                    sizeHint="wide",
                    applicable=True,
                    payload=None,
                    warningState={"code": "dashboard_fallback", "title": "Dashboard running in safe mode", "description": "Complete setup to load full analytics."},
                    emptyState=DashboardEmptyState(
                        kind="setup_required",
                        title="Continue setup",
                        description="Dashboard data will populate as accounting activity grows.",
                        primaryCta={"label": "Open setup", "route": "/setup"},
                    ),
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

    def _trend_series(self, organization_id: UUID, *, months: int, currency: str) -> list[dict]:
        points: list[dict] = []
        today = date.today()
        for offset in range(months - 1, -1, -1):
            month_start = date(today.year, today.month, 1)
            shifted = month_start.month - offset - 1
            year = month_start.year + shifted // 12
            month = shifted % 12 + 1
            bucket_start = date(year, month, 1)
            next_month = date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)
            revenue, expenses = self._month_profitability(organization_id, bucket_start)
            cash_movement = self.db.scalar(
                select(func.coalesce(func.sum(BankTransaction.amount), 0)).where(
                    BankTransaction.organization_id == organization_id,
                    BankTransaction.deleted_at.is_(None),
                    BankTransaction.transaction_date >= bucket_start,
                    BankTransaction.transaction_date < next_month,
                )
            ) or Decimal("0")
            points.append({
                "periodKey": bucket_start.isoformat(),
                "label": bucket_start.strftime("%b"),
                "revenue": self._money(revenue, currency).model_dump(),
                "expenses": self._money(expenses, currency).model_dump(),
                "netResult": self._money(revenue - expenses, currency).model_dump(),
                "cashMovement": self._money(cash_movement, currency).model_dump(),
            })
        return points

    def _aging_payload(self, organization_id: UUID, today: date, currency: str) -> list[dict]:
        definitions = [("current", "Current"), ("1_30", "1-30"), ("31_60", "31-60"), ("61_90", "61-90"), ("90_plus", "90+")]
        receivable_rows = self.db.execute(select(Invoice.due_date, Invoice.amount_due).where(Invoice.organization_id == organization_id, Invoice.deleted_at.is_(None), Invoice.amount_due > 0)).all()
        payable_rows = self.db.execute(select(Bill.due_date, Bill.amount_due).where(Bill.organization_id == organization_id, Bill.deleted_at.is_(None), Bill.amount_due > 0)).all()
        if not receivable_rows and not payable_rows:
            return []

        def bucket_for_due(due_date: date) -> str:
            days_overdue = (today - due_date).days
            if days_overdue <= 0:
                return "current"
            if days_overdue <= 30:
                return "1_30"
            if days_overdue <= 60:
                return "31_60"
            if days_overdue <= 90:
                return "61_90"
            return "90_plus"

        receivables = defaultdict(lambda: Decimal("0"))
        payables = defaultdict(lambda: Decimal("0"))
        receivable_count = defaultdict(int)
        payable_count = defaultdict(int)

        for due, amount in receivable_rows:
            key = bucket_for_due(due)
            receivables[key] += amount or Decimal("0")
            receivable_count[key] += 1
        for due, amount in payable_rows:
            key = bucket_for_due(due)
            payables[key] += amount or Decimal("0")
            payable_count[key] += 1

        return [
            {
                "bucketKey": key,
                "label": label,
                "receivables": {**self._money(receivables[key], currency).model_dump(), "count": receivable_count[key]},
                "payables": {**self._money(payables[key], currency).model_dump(), "count": payable_count[key]},
            }
            for key, label in definitions
        ]

    def _workflow_payload(self, organization_id: UUID, currency: str) -> tuple[DashboardWidgetEnvelope, DashboardWidgetEnvelope]:
        invoice_counts = self.db.execute(select(Invoice.status, func.count(Invoice.id), func.coalesce(func.sum(Invoice.amount_due), 0)).where(Invoice.organization_id == organization_id, Invoice.deleted_at.is_(None)).group_by(Invoice.status)).all()
        bill_counts = self.db.execute(select(Bill.status, func.count(Bill.id), func.coalesce(func.sum(Bill.amount_due), 0)).where(Bill.organization_id == organization_id, Bill.deleted_at.is_(None)).group_by(Bill.status)).all()

        invoice_payload = [{"status": str(status), "count": int(count), "amount": self._money(amount, currency).model_dump()} for status, count, amount in invoice_counts]
        bill_payload = [{"status": str(status), "count": int(count), "amount": self._money(amount, currency).model_dump()} for status, count, amount in bill_counts]

        return (
            DashboardWidgetEnvelope(
                widgetKey="invoice_workflow_summary",
                title="Invoice Workflow",
                status="ok" if invoice_payload else "empty",
                sizeHint="medium",
                applicable=True,
                drilldownTarget=DashboardDrilldownTarget(route="/invoices", label="Open invoices"),
                payload={"totalInvoicesInScope": sum(item["count"] for item in invoice_payload), "statuses": invoice_payload} if invoice_payload else None,
                emptyState=None if invoice_payload else DashboardEmptyState(kind="no_data", title="No invoice workflow data"),
            ),
            DashboardWidgetEnvelope(
                widgetKey="bill_workflow_summary",
                title="Bill Workflow",
                status="ok" if bill_payload else "empty",
                sizeHint="medium",
                applicable=True,
                drilldownTarget=DashboardDrilldownTarget(route="/bills", label="Open bills"),
                payload={"totalBillsInScope": sum(item["count"] for item in bill_payload), "statuses": bill_payload} if bill_payload else None,
                emptyState=None if bill_payload else DashboardEmptyState(kind="no_data", title="No bill workflow data"),
            ),
        )

    def _recent_activity_payload(self, organization_id: UUID) -> list[dict]:
        rows = self.db.execute(select(AuditLog).where(AuditLog.organization_id == organization_id).order_by(AuditLog.created_at.desc()).limit(8)).scalars().all()
        return [
            {
                "activityId": str(row.id),
                "occurredAt": row.created_at.isoformat(),
                "relativeTimeLabel": "recent",
                "type": row.action,
                "title": row.action.replace("_", " ").replace(".", " ").title(),
                "description": row.entity_type,
            }
            for row in rows
        ]

    def _recommendations_payload(self, receivables: _Exposure, payables: _Exposure) -> list[dict]:
        items: list[dict] = []
        if receivables.overdue_count > 0:
            items.append({"id": "review_overdue_invoices", "type": "review_overdue_invoices", "priority": "high", "title": "Review overdue invoices", "description": f"{receivables.overdue_count} invoices are overdue.", "cta": {"label": "Open invoices", "route": "/invoices"}})
        if payables.overdue_count > 0:
            items.append({"id": "resolve_overdue_bills", "type": "resolve_overdue_bills", "priority": "high", "title": "Resolve overdue bills", "description": f"{payables.overdue_count} bills are overdue.", "cta": {"label": "Open bills", "route": "/bills"}})
        if not items:
            items.append({"id": "run_month_end_reports", "type": "run_month_end_reports", "priority": "low", "title": "Run month-end reports", "description": "Review P&L and balance sheet for period close.", "cta": {"label": "Open reports", "route": "/reports"}})
        return items[:5]

    def _attention_payload(self, organization_id: UUID, receivables: _Exposure, payables: _Exposure, onboarding: OrgOnboardingStatus | None, today: date, currency: str) -> DashboardWidgetEnvelope:
        items: list[dict] = []
        if receivables.overdue_count:
            items.append({"id": "overdue_invoices", "type": "overdue_invoices", "priority": "high", "title": "Overdue invoices", "description": f"{receivables.overdue_count} overdue invoices require follow-up.", "metric": {"value": str(receivables.overdue_count), "formatted": self._money(receivables.overdue_amount, currency).formatted, "label": "overdue balance"}, "cta": {"label": "Open invoices", "route": "/invoices"}})
        if payables.overdue_count:
            items.append({"id": "bills_due", "type": "bills_due", "priority": "high", "title": "Overdue bills", "description": f"{payables.overdue_count} bills need payment scheduling.", "metric": {"value": str(payables.overdue_count), "formatted": self._money(payables.overdue_amount, currency).formatted, "label": "overdue balance"}, "cta": {"label": "Open bills", "route": "/bills"}})

        unreconciled = self.db.scalar(select(func.count(BankTransaction.id)).where(BankTransaction.organization_id == organization_id, BankTransaction.deleted_at.is_(None), BankTransaction.status == BankTransactionStatus.UNRECONCILED)) or 0
        if unreconciled:
            items.append({"id": "unreconciled_transactions", "type": "unreconciled_transactions", "priority": "medium", "title": "Unreconciled bank transactions", "description": f"{unreconciled} transactions need reconciliation.", "cta": {"label": "Open reconciliation", "route": "/banking/reconciliations"}})

        if onboarding and onboarding.completion_tier < 2:
            items.append({"id": "onboarding_blocker", "type": "onboarding_blocker", "priority": "medium", "title": "Setup blockers remain", "description": "Complete onboarding to unlock full dashboard value.", "cta": {"label": "Continue setup", "route": "/setup"}})

        return DashboardWidgetEnvelope(
            widgetKey="attention_center",
            title="Attention Center",
            status="ok" if items else "empty",
            priority="high",
            sizeHint="large",
            applicable=True,
            drilldownTarget=DashboardDrilldownTarget(route="/activity", label="Open activity"),
            payload={"totalAttentionItems": len(items), "highestPriority": items[0]["priority"] if items else "none", "items": items[:8]} if items else None,
            emptyState=None if items else DashboardEmptyState(kind="healthy_empty", title="No urgent issues", description="Your operational queue is clear."),
        )

    def _onboarding_status(self, organization_id: UUID) -> OrgOnboardingStatus | None:
        if not self._has_table("org_onboarding_status"):
            return None
        return self.db.scalar(select(OrgOnboardingStatus).where(OrgOnboardingStatus.organization_id == organization_id))

    def _maturity(self, onboarding: OrgOnboardingStatus | None, receivables: _Exposure, payables: _Exposure) -> str:
        if onboarding and onboarding.completion_tier >= 3:
            return "mature"
        if receivables.open_count + payables.open_count > 0:
            return "active"
        return "new"

    def _onboarding_widget(self, onboarding: OrgOnboardingStatus | None, maturity: str) -> DashboardWidgetEnvelope:
        if maturity == "mature":
            return DashboardWidgetEnvelope(
                widgetKey="onboarding_progress",
                title="Onboarding Progress",
                status="empty",
                applicable=False,
                hiddenReason="Onboarding complete",
                payload=None,
            )

        completion = onboarding.completion_tier * 25 if onboarding else 0
        next_label = "Continue organization setup"
        return DashboardWidgetEnvelope(
            widgetKey="onboarding_progress",
            title="Onboarding Progress",
            status="ok",
            priority="high",
            sizeHint="wide",
            applicable=True,
            drilldownTarget=DashboardDrilldownTarget(route="/setup", label="Open setup"),
            payload={
                "completionPercentage": str(completion),
                "currentStage": "operational" if completion >= 50 else "basics",
                "completedTaskCount": completion // 25,
                "totalTaskCount": 4,
                "nextTask": {"title": next_label, "cta": {"label": "Continue", "route": "/setup"}},
            },
        )

    def _billing_widget(self, organization_id: UUID, currency: str) -> DashboardWidgetEnvelope:
        if not self._has_table("billing_accounts") or not self._has_table("subscriptions"):
            return DashboardWidgetEnvelope(widgetKey="billing_subscription_status", title="Billing Status", status="empty", applicable=False, hiddenReason="Billing not available", payload=None)

        row = self.db.execute(
            select(Subscription, BillingAccount)
            .join(BillingAccount, BillingAccount.id == Subscription.billing_account_id)
            .where(BillingAccount.organization_id == organization_id)
            .order_by(Subscription.created_at.desc())
            .limit(1)
        ).first()

        if not row:
            return DashboardWidgetEnvelope(
                widgetKey="billing_subscription_status",
                title="Billing Status",
                status="empty",
                applicable=True,
                payload=None,
                emptyState=DashboardEmptyState(kind="not_configured", title="Billing not configured", primaryCta={"label": "Open billing", "route": "/settings/billing"}),
            )

        sub = row[0]
        warning = None
        if sub.status in [SubscriptionStatus.PAST_DUE, SubscriptionStatus.UNPAID]:
            warning = {"code": "payment_failed", "title": "Payment attention required"}

        return DashboardWidgetEnvelope(
            widgetKey="billing_subscription_status",
            title="Billing Status",
            status="warning" if warning else "ok",
            sizeHint="medium",
            applicable=True,
            drilldownTarget=DashboardDrilldownTarget(route="/settings/billing", label="Open billing"),
            payload={
                "planName": sub.plan_code,
                "subscriptionStatus": sub.status,
                "seatsUsed": None,
                "seatsAllowed": sub.seats_purchased,
                "trialEndsAt": sub.trial_end_at,
                "warning": warning,
                "primaryAction": {"label": "Manage billing", "route": "/settings/billing"},
            },
        )

    def _integration_health_widget(self, organization_id: UUID) -> DashboardWidgetEnvelope:
        if not self._has_table("integration_connections"):
            return DashboardWidgetEnvelope(widgetKey="integration_health_summary", title="Integration Health", status="empty", applicable=False, hiddenReason="Integrations not available", payload=None)

        rows = self.db.execute(select(IntegrationConnection).where(IntegrationConnection.organization_id == organization_id, IntegrationConnection.deleted_at.is_(None))).scalars().all()
        if not rows:
            return DashboardWidgetEnvelope(
                widgetKey="integration_health_summary",
                title="Integration Health",
                status="empty",
                applicable=True,
                payload=None,
                emptyState=DashboardEmptyState(kind="not_configured", title="No integrations connected", primaryCta={"label": "Open integrations", "route": "/integrations"}),
            )

        total = len(rows)
        failed = len([r for r in rows if r.status == IntegrationConnectionStatus.FAILED])
        degraded = len([r for r in rows if r.status == IntegrationConnectionStatus.DEGRADED])
        reauth = len([r for r in rows if r.status == IntegrationConnectionStatus.REQUIRES_REAUTH])
        healthy = total - failed - degraded - reauth

        return DashboardWidgetEnvelope(
            widgetKey="integration_health_summary",
            title="Integration Health",
            status="warning" if (failed or degraded or reauth) else "ok",
            sizeHint="medium",
            applicable=True,
            drilldownTarget=DashboardDrilldownTarget(route="/integrations", label="Open integrations"),
            payload={
                "totalConnections": total,
                "healthyConnections": healthy,
                "degradedConnections": degraded,
                "failedConnections": failed,
                "requiresReauthConnections": reauth,
                "topIssues": [
                    {
                        "connectionId": str(row.id),
                        "providerName": row.display_name,
                        "status": row.status,
                        "title": row.last_error_code or "Connection requires attention",
                        "description": row.last_error_message,
                        "cta": {"label": "Review", "route": "/integrations"},
                    }
                    for row in rows
                    if row.status in [IntegrationConnectionStatus.FAILED, IntegrationConnectionStatus.DEGRADED, IntegrationConnectionStatus.REQUIRES_REAUTH]
                ][:3],
            },
        )

    def _cash_payload(self, cash_balance: Decimal, month_cash_movement: Decimal, currency: str) -> dict:
        return {
            "currency": currency,
            "totalCashBalance": self._money(cash_balance, currency).model_dump(),
            "accountCount": 0,
            "asOf": date.today().isoformat(),
            "delta": {
                "direction": "up" if month_cash_movement > 0 else "down" if month_cash_movement < 0 else "flat",
                **self._money(month_cash_movement, currency).model_dump(),
                "label": "month-to-date",
            },
        }

    def _receivable_payload(self, receivables: _Exposure, currency: str) -> dict:
        return {
            "currency": currency,
            "totalOutstanding": self._money(receivables.open_amount, currency).model_dump(),
            "invoiceCount": receivables.open_count,
            "overdue": {**self._money(receivables.overdue_amount, currency).model_dump(), "invoiceCount": receivables.overdue_count},
            "current": {**self._money(receivables.open_amount - receivables.overdue_amount, currency).model_dump(), "invoiceCount": max(receivables.open_count - receivables.overdue_count, 0)},
            "dueSoon": None,
        }

    def _payable_payload(self, payables: _Exposure, currency: str) -> dict:
        return {
            "currency": currency,
            "totalOutstanding": self._money(payables.open_amount, currency).model_dump(),
            "billCount": payables.open_count,
            "overdue": {**self._money(payables.overdue_amount, currency).model_dump(), "billCount": payables.overdue_count},
            "dueSoon": {**self._money(Decimal("0"), currency).model_dump(), "billCount": 0, "horizonDays": 7},
            "current": {**self._money(payables.open_amount - payables.overdue_amount, currency).model_dump(), "billCount": max(payables.open_count - payables.overdue_count, 0)},
        }

    def _period_amount_payload(self, amount: Decimal, period_start: date, period_end: date, currency: str) -> dict:
        return {
            "currency": currency,
            "period": {"startDate": period_start.isoformat(), "endDate": period_end.isoformat(), "label": period_start.strftime("%B %Y")},
            "amount": self._money(amount, currency).model_dump(),
        }

    def _net_payload(self, net: Decimal, period_start: date, period_end: date, currency: str) -> dict:
        direction = "positive" if net > 0 else "negative" if net < 0 else "breakeven"
        return {
            "currency": currency,
            "period": {"startDate": period_start.isoformat(), "endDate": period_end.isoformat(), "label": period_start.strftime("%B %Y")},
            "netResult": {**self._money(net, currency).model_dump(), "direction": direction},
        }
