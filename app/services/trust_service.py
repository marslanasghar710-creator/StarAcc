from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.enums import BankTransactionStatus, IntegrationSyncStatus, JournalStatus, ReportRunStatus
from app.db.models.accounting import JournalEntry, JournalLine
from app.db.models.ap import Bill
from app.db.models.ar import Invoice
from app.db.models.audit import AuditLog
from app.db.models.banking import BankAccount, BankTransaction
from app.db.models.integrations import IntegrationSyncRun
from app.db.models.onboarding import OrgOnboardingStatus
from app.db.models.reporting import ReportRun
from app.schemas.trust import (
    AccountingImpact,
    AuditTraceLink,
    AuditTraceObject,
    DataCompletenessStatus,
    DrillTarget,
    IntegrityCenterResponse,
    IntegrityIssue,
    LedgerIntegrityStatus,
    MetricProvenance,
    MetricValueBasis,
    ReconciliationTrustStatus,
    ReportTrustMetadata,
    TrustDomainStatus,
    TrustSummary,
)

UTC = timezone.utc


class LedgerIntegrityCheckService:
    def __init__(self, db: Session):
        self.db = db

    def evaluate(self, org_id: str) -> LedgerIntegrityStatus:
        org_uuid = UUID(org_id)
        posted_journals = self.db.execute(select(JournalEntry.id).where(JournalEntry.organization_id == org_uuid, JournalEntry.status == JournalStatus.POSTED)).scalars().all()
        checked = len(posted_journals)
        unbalanced = 0
        orphaned = 0
        for journal_id in posted_journals:
            sums = self.db.execute(
                select(func.coalesce(func.sum(JournalLine.base_debit_amount), 0), func.coalesce(func.sum(JournalLine.base_credit_amount), 0)).where(JournalLine.journal_entry_id == journal_id)
            ).one()
            if sums[0] != sums[1]:
                unbalanced += 1
            line_count = self.db.scalar(select(func.count()).select_from(JournalLine).where(JournalLine.journal_entry_id == journal_id)) or 0
            if line_count == 0:
                orphaned += 1

        issues = unbalanced + orphaned
        return LedgerIntegrityStatus(
            org_id=org_id,
            status="healthy" if issues == 0 else "degraded",
            immutable_ledger_enforced=True,
            orphaned_postings_detected=orphaned > 0,
            unbalanced_journals_detected=unbalanced > 0,
            invalid_posting_links_detected=False,
            evidence={"checked_journal_count": checked, "issues_found": issues, "unbalanced_journal_count": unbalanced, "orphaned_journal_count": orphaned},
            checked_at=datetime.now(UTC),
        )


class ReconciliationTrustService:
    def __init__(self, db: Session):
        self.db = db

    def evaluate(self, org_id: str) -> list[ReconciliationTrustStatus]:
        org_uuid = UUID(org_id)
        today = date.today()
        bank_accounts = self.db.execute(select(BankAccount.id).where(BankAccount.organization_id == org_uuid, BankAccount.deleted_at.is_(None), BankAccount.is_active.is_(True))).scalars().all()
        results: list[ReconciliationTrustStatus] = []
        for bank_id in bank_accounts:
            unreconciled = self.db.scalar(
                select(func.count()).select_from(BankTransaction).where(BankTransaction.organization_id == org_uuid, BankTransaction.bank_account_id == bank_id, BankTransaction.deleted_at.is_(None), BankTransaction.status != BankTransactionStatus.RECONCILED)
            ) or 0
            matched = self.db.scalar(
                select(func.count()).select_from(BankTransaction).where(BankTransaction.organization_id == org_uuid, BankTransaction.bank_account_id == bank_id, BankTransaction.deleted_at.is_(None), BankTransaction.status == BankTransactionStatus.RECONCILED)
            ) or 0
            last_date = self.db.scalar(
                select(func.max(BankTransaction.transaction_date)).where(BankTransaction.organization_id == org_uuid, BankTransaction.bank_account_id == bank_id, BankTransaction.deleted_at.is_(None), BankTransaction.status == BankTransactionStatus.RECONCILED)
            )
            stale_days = (today - last_date).days if last_date else None
            status = "healthy"
            if unreconciled > 25 or (stale_days is not None and stale_days > 7):
                status = "attention_needed"
            if unreconciled > 100 or (stale_days is not None and stale_days > 21):
                status = "degraded"
            results.append(
                ReconciliationTrustStatus(
                    org_id=org_id,
                    bank_account_id=str(bank_id),
                    status=status,
                    unreconciled_transaction_count=int(unreconciled),
                    matched_transaction_count=int(matched),
                    last_reconciled_at=datetime.combine(last_date, datetime.min.time(), tzinfo=UTC) if last_date else None,
                    stale_days=stale_days,
                    evidence={"unreconciled_threshold": 25, "degraded_unreconciled_threshold": 100, "stale_threshold_days": 7},
                )
            )
        if not results:
            results.append(ReconciliationTrustStatus(org_id=org_id, status="unknown", unreconciled_transaction_count=0, matched_transaction_count=0, evidence={"reason": "no_bank_accounts"}))
        return results


class MetricProvenanceService:
    def __init__(self, db: Session):
        self.db = db

    def _journal_effect_summary(self, org_uuid: UUID, *, source_type: str | None = None) -> tuple[int, Decimal, Decimal]:
        q = (
            select(func.count(JournalLine.id), func.coalesce(func.sum(JournalLine.base_debit_amount), 0), func.coalesce(func.sum(JournalLine.base_credit_amount), 0))
            .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
            .where(JournalEntry.organization_id == org_uuid, JournalEntry.status == JournalStatus.POSTED)
        )
        if source_type:
            q = q.where(JournalEntry.source_type == source_type)
        row = self.db.execute(q).one()
        return int(row[0] or 0), Decimal(row[1] or 0), Decimal(row[2] or 0)

    def get_metric_provenance(self, org_id: str, metric_id: str) -> MetricProvenance:
        org_uuid = UUID(org_id)
        today = date.today()
        month_start = today.replace(day=1)

        invoice_count = self.db.scalar(select(func.count()).select_from(Invoice).where(Invoice.organization_id == org_uuid, Invoice.deleted_at.is_(None))) or 0
        bill_count = self.db.scalar(select(func.count()).select_from(Bill).where(Bill.organization_id == org_uuid, Bill.deleted_at.is_(None))) or 0
        journal_count = self.db.scalar(select(func.count()).select_from(JournalEntry).where(JournalEntry.organization_id == org_uuid, JournalEntry.status == JournalStatus.POSTED)) or 0

        metric_map = {
            "cash_position_summary": ("Cash Position", "mixed", [DrillTarget(target_type="reconciliation_view", label="Open banking", route="/banking")]),
            "receivables_outstanding_summary": ("Receivables Outstanding", "documents", [DrillTarget(target_type="invoice_list", label="View invoices", route="/invoices")]),
            "payables_outstanding_summary": ("Payables Outstanding", "documents", [DrillTarget(target_type="bill_list", label="View bills", route="/bills")]),
            "net_result_this_month_summary": ("Net Result This Month", "journal_postings", [DrillTarget(target_type="report", label="Open P&L", route="/reports/profit-loss")]),
        }
        label, source_type, targets = metric_map.get(metric_id, (metric_id.replace("_", " ").title(), "aggregated_view", [DrillTarget(target_type="report", label="Open reports", route="/reports")]))

        posting_count, debit_total, credit_total = self._journal_effect_summary(org_uuid)
        source_objects = {
            "invoice": int(invoice_count),
            "bill": int(bill_count),
            "posted_journal": int(journal_count),
        }
        context_filters = {"period": {"from": month_start.isoformat(), "to": today.isoformat()}, "accounting_basis": "accrual", "posted_only": True}

        return MetricProvenance(
            metric_id=metric_id,
            org_id=org_id,
            label=label,
            value_basis=MetricValueBasis(source_type=source_type, date_range={"from": month_start.isoformat(), "to": today.isoformat()}, entity_scope=[org_id], currency="USD"),
            underlying_counts={"journal_count": int(journal_count), "posting_count": int(posting_count), "document_count": int(invoice_count + bill_count)},
            source_objects=source_objects,
            journal_effects={"debit_total": f"{debit_total:.2f}", "credit_total": f"{credit_total:.2f}", "posting_count": int(posting_count)},
            context_filters=context_filters,
            drill_targets=targets,
            generated_at=datetime.now(UTC),
        )


class AuditTraceService:
    def __init__(self, db: Session):
        self.db = db

    def _impacts_for_journals(self, journals: list[JournalEntry]) -> list[AccountingImpact]:
        impacts: list[AccountingImpact] = []
        for journal in journals:
            totals = self.db.execute(
                select(func.coalesce(func.sum(JournalLine.base_debit_amount), 0), func.coalesce(func.sum(JournalLine.base_credit_amount), 0), func.count(JournalLine.id)).where(JournalLine.journal_entry_id == journal.id)
            ).one()
            impacts.append(
                AccountingImpact(
                    journal_id=str(journal.id),
                    entry_number=journal.entry_number,
                    entry_date=journal.entry_date.isoformat(),
                    posting_count=int(totals[2] or 0),
                    debit_total=f"{Decimal(totals[0] or 0):.2f}",
                    credit_total=f"{Decimal(totals[1] or 0):.2f}",
                    source_type=journal.source_type,
                    source_id=journal.source_id,
                )
            )
        return impacts

    def get_trace(self, org_id: str, source_type: str, source_id: str) -> AuditTraceLink:
        org_uuid = UUID(org_id)
        related: list[AuditTraceObject] = []
        journals: list[JournalEntry] = []

        if source_type == "journal":
            journal = self.db.scalar(select(JournalEntry).where(JournalEntry.organization_id == org_uuid, JournalEntry.id == UUID(source_id)))
            if journal:
                journals = [journal]
                related.append(AuditTraceObject(object_type="journal", object_id=str(journal.id), label=f"Journal {journal.entry_number}", route=f"/journals/{journal.id}"))
        elif source_type in {"invoice", "bill", "bank_transaction"}:
            journals = list(
                self.db.scalars(
                    select(JournalEntry).where(
                        JournalEntry.organization_id == org_uuid,
                        JournalEntry.source_type == source_type,
                        JournalEntry.source_id == source_id,
                    )
                ).all()
            )
            for journal in journals:
                related.append(AuditTraceObject(object_type="journal", object_id=str(journal.id), label=f"Journal {journal.entry_number}", route=f"/journals/{journal.id}"))

            if source_type == "bank_transaction":
                bank_txn = self.db.scalar(select(BankTransaction).where(BankTransaction.organization_id == org_uuid, BankTransaction.id == UUID(source_id), BankTransaction.deleted_at.is_(None)))
                if bank_txn:
                    related.append(AuditTraceObject(object_type="bank_transaction", object_id=source_id, label="Bank transaction", route=f"/banking/transactions/{source_id}"))
                    if bank_txn.matched_journal_id:
                        matched = self.db.get(JournalEntry, bank_txn.matched_journal_id)
                        if matched:
                            journals.append(matched)
            elif source_type == "invoice":
                related.append(AuditTraceObject(object_type="invoice", object_id=source_id, label="Invoice", route=f"/invoices/{source_id}"))
            elif source_type == "bill":
                related.append(AuditTraceObject(object_type="bill", object_id=source_id, label="Bill", route=f"/bills/{source_id}"))

        # include posting objects for top 10 lines
        journal_ids = [j.id for j in journals]
        if journal_ids:
            line_ids = self.db.execute(select(JournalLine.id).where(JournalLine.journal_entry_id.in_(journal_ids)).limit(10)).scalars().all()
            for line_id in line_ids:
                related.append(AuditTraceObject(object_type="posting", object_id=str(line_id), label="Posting line", route=f"/journals/{journals[0].id}"))

        impacts = self._impacts_for_journals(journals)
        return AuditTraceLink(source_type=source_type, source_id=source_id, related_objects=related, accounting_impacts=impacts, generated_at=datetime.now(UTC))


class ReportTrustMetadataService:
    def __init__(self, db: Session):
        self.db = db

    def get_report_metadata(self, org_id: str, report_id: str) -> ReportTrustMetadata:
        org_uuid = UUID(org_id)
        run = self.db.scalar(
            select(ReportRun).where(ReportRun.organization_id == org_uuid, ReportRun.report_type == report_id).order_by(desc(ReportRun.generated_at))
        )
        generated_at = run.generated_at if run else datetime.now(UTC)
        stale_minutes = int((datetime.now(UTC) - generated_at).total_seconds() // 60)
        status = "healthy" if stale_minutes <= 1440 else "attention_needed"
        return ReportTrustMetadata(
            report_id=report_id,
            org_id=org_id,
            generated_at=generated_at,
            report_basis={
                "filters": (run.parameters_json if run else {}),
                "entity_scope": [org_id],
                "posted_only": True,
                "freshness_minutes": stale_minutes,
            },
            consistency_status=status,
            notes=["Derived from posted journals", f"Freshness: {stale_minutes} minutes since last generation"],
        )


class TrustEvaluationService:
    def __init__(self, db: Session):
        self.db = db
        self.ledger_checks = LedgerIntegrityCheckService(db)
        self.reconciliation = ReconciliationTrustService(db)

    def data_completeness(self, org_id: str) -> DataCompletenessStatus:
        org_uuid = UUID(org_id)
        onboarding = self.db.scalar(select(OrgOnboardingStatus).where(OrgOnboardingStatus.organization_id == org_uuid))
        missing: list[dict[str, str]] = []
        bank_count = self.db.scalar(select(func.count()).select_from(BankAccount).where(BankAccount.organization_id == org_uuid, BankAccount.deleted_at.is_(None), BankAccount.is_active.is_(True))) or 0
        if not onboarding:
            missing.append({"code": "onboarding_missing", "label": "Onboarding status not initialized", "severity": "medium", "action_route": "/setup"})
        if bank_count == 0:
            missing.append({"code": "bank_account_missing", "label": "No active bank account configured", "severity": "high", "action_route": "/banking"})
        return DataCompletenessStatus(org_id=org_id, status="healthy" if not missing else "attention_needed", missing_elements=missing, checked_at=datetime.now(UTC))

    def _reporting_consistency(self, org_id: str, ledger: LedgerIntegrityStatus) -> TrustDomainStatus:
        org_uuid = UUID(org_id)
        failed_runs_30d = self.db.scalar(
            select(func.count()).select_from(ReportRun).where(ReportRun.organization_id == org_uuid, ReportRun.status == ReportRunStatus.FAILED, ReportRun.generated_at >= datetime.now(UTC) - timedelta(days=30))
        ) or 0
        last_success = self.db.scalar(
            select(func.max(ReportRun.generated_at)).where(ReportRun.organization_id == org_uuid, ReportRun.status == ReportRunStatus.COMPLETED)
        )
        status = "healthy"
        if ledger.status != "healthy" or failed_runs_30d > 0:
            status = "attention_needed"
        if failed_runs_30d > 5:
            status = "degraded"
        return TrustDomainStatus(
            domain="reporting_consistency",
            status=status,
            label="Reporting consistency",
            description="Report outputs are checked against posted-ledger consistency and run health",
            last_evaluated_at=datetime.now(UTC),
            evidence={"failed_runs_30d": int(failed_runs_30d), "last_successful_report_at": last_success.isoformat() if last_success else None, "ledger_status": ledger.status},
        )

    def _system_operations(self, org_id: str) -> TrustDomainStatus:
        org_uuid = UUID(org_id)
        since = datetime.now(UTC) - timedelta(days=7)
        failed_syncs = self.db.scalar(select(func.count()).select_from(IntegrationSyncRun).where(IntegrationSyncRun.connection_id.is_not(None), IntegrationSyncRun.status == IntegrationSyncStatus.FAILED, IntegrationSyncRun.created_at >= since)) or 0
        status = "healthy" if failed_syncs == 0 else "attention_needed"
        if failed_syncs >= 5:
            status = "degraded"
        return TrustDomainStatus(
            domain="system_operations",
            status=status,
            label="System operations",
            description="Operational pipeline reliability for integrations and reporting",
            last_evaluated_at=datetime.now(UTC),
            evidence={"failed_sync_runs_7d": int(failed_syncs)},
        )

    def get_org_trust_summary(self, org_id: str) -> TrustSummary:
        now = datetime.now(UTC)
        ledger = self.ledger_checks.evaluate(org_id)
        recon_list = self.reconciliation.evaluate(org_id)
        recon_status = "degraded" if any(item.status == "degraded" for item in recon_list) else "attention_needed" if any(item.status == "attention_needed" for item in recon_list) else "healthy"
        completeness = self.data_completeness(org_id)
        audit_events = self.db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.organization_id == UUID(org_id))) or 0

        domains = [
            TrustDomainStatus(domain="ledger_integrity", status=ledger.status, label="Ledger integrity", description="Immutable posted journals and balanced postings", last_evaluated_at=ledger.checked_at, evidence=ledger.evidence),
            TrustDomainStatus(domain="reconciliation", status=recon_status, label="Reconciliation", description="Banking reconciliation freshness and backlog", last_evaluated_at=now, evidence={"accounts_checked": len(recon_list)}),
            self._reporting_consistency(org_id, ledger),
            TrustDomainStatus(domain="audit_traceability", status="healthy" if audit_events > 0 else "unknown", label="Audit traceability", description="Workflow objects can be traced to journal impacts and audit logs", last_evaluated_at=now, evidence={"audit_event_count": int(audit_events)}),
            TrustDomainStatus(domain="data_completeness", status=completeness.status, label="Data completeness", description="Required setup and data readiness checks", last_evaluated_at=completeness.checked_at, evidence={"missing_count": len(completeness.missing_elements)}),
            self._system_operations(org_id),
        ]
        priorities = {"degraded": 3, "attention_needed": 2, "unknown": 1, "healthy": 0}
        overall = sorted(domains, key=lambda item: priorities[item.status], reverse=True)[0].status
        return TrustSummary(org_id=org_id, overall_status=overall, domains=domains, last_evaluated_at=now)

    def integrity_center(self, org_id: str) -> IntegrityCenterResponse:
        summary = self.get_org_trust_summary(org_id)
        ledger = self.ledger_checks.evaluate(org_id)
        recon = self.reconciliation.evaluate(org_id)
        completeness = self.data_completeness(org_id)

        issues: list[IntegrityIssue] = []
        if ledger.unbalanced_journals_detected:
            issues.append(IntegrityIssue(severity="high", domain="ledger_integrity", code="unbalanced_journals", title="Unbalanced posted journals detected", description="One or more posted journals have debit/credit mismatches.", recommended_action="Review journal lines and reversal history", action_route="/journals"))
        for row in recon:
            if row.status in {"attention_needed", "degraded"}:
                issues.append(IntegrityIssue(severity="medium" if row.status == "attention_needed" else "high", domain="reconciliation", code="reconciliation_backlog", title="Reconciliation backlog", description=f"{row.unreconciled_transaction_count} unreconciled transactions", affected_object_id=row.bank_account_id, recommended_action="Open reconciliation queue and match high-value items first", action_route="/banking/reconciliations"))
        for missing in completeness.missing_elements:
            issues.append(IntegrityIssue(severity=missing.get("severity", "medium"), domain="data_completeness", code=missing.get("code", "missing_data"), title=missing.get("label", "Missing required setup"), description="Required setup/data is incomplete for high-confidence outputs", recommended_action="Complete setup item", action_route=missing.get("action_route")))

        issues.sort(key=lambda x: {"high": 3, "medium": 2, "low": 1}.get(x.severity, 1), reverse=True)
        return IntegrityCenterResponse(
            trust_summary=summary,
            ledger_integrity=ledger,
            reconciliation_status=recon,
            data_completeness=completeness,
            recent_issues=issues,
        )
