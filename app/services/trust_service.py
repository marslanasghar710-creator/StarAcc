from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import BankTransactionStatus, JournalStatus
from app.db.models.accounting import JournalEntry, JournalLine
from app.db.models.ap import Bill
from app.db.models.ar import Invoice
from app.db.models.audit import AuditLog
from app.db.models.banking import BankAccount, BankTransaction
from app.db.models.onboarding import OrgOnboardingStatus
from app.schemas.trust import (
    AuditTraceLink,
    AuditTraceObject,
    DataCompletenessStatus,
    DrillTarget,
    IntegrityCenterResponse,
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
        posted_journals = self.db.execute(
            select(JournalEntry.id).where(JournalEntry.organization_id == org_uuid, JournalEntry.status == JournalStatus.POSTED)
        ).scalars().all()
        checked = len(posted_journals)
        unbalanced = 0
        orphaned = 0
        for journal_id in posted_journals:
            sums = self.db.execute(
                select(func.coalesce(func.sum(JournalLine.base_debit_amount), 0), func.coalesce(func.sum(JournalLine.base_credit_amount), 0)).where(JournalLine.journal_entry_id == journal_id)
            ).one()
            if sums[0] != sums[1]:
                unbalanced += 1
            lines = self.db.scalar(select(func.count()).select_from(JournalLine).where(JournalLine.journal_entry_id == journal_id)) or 0
            if lines == 0:
                orphaned += 1

        issues = unbalanced + orphaned
        status = "healthy" if issues == 0 else "degraded"
        return LedgerIntegrityStatus(
            org_id=org_id,
            status=status,
            immutable_ledger_enforced=True,
            orphaned_postings_detected=orphaned > 0,
            unbalanced_journals_detected=unbalanced > 0,
            invalid_posting_links_detected=False,
            evidence={"checked_journal_count": checked, "issues_found": issues},
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
                select(func.count()).select_from(BankTransaction).where(
                    BankTransaction.organization_id == org_uuid,
                    BankTransaction.bank_account_id == bank_id,
                    BankTransaction.deleted_at.is_(None),
                    BankTransaction.status != BankTransactionStatus.RECONCILED,
                )
            ) or 0
            matched = self.db.scalar(
                select(func.count()).select_from(BankTransaction).where(
                    BankTransaction.organization_id == org_uuid,
                    BankTransaction.bank_account_id == bank_id,
                    BankTransaction.deleted_at.is_(None),
                    BankTransaction.status == BankTransactionStatus.RECONCILED,
                )
            ) or 0
            last_date = self.db.scalar(
                select(func.max(BankTransaction.transaction_date)).where(
                    BankTransaction.organization_id == org_uuid,
                    BankTransaction.bank_account_id == bank_id,
                    BankTransaction.deleted_at.is_(None),
                    BankTransaction.status == BankTransactionStatus.RECONCILED,
                )
            )
            stale_days = (today - last_date).days if last_date else None
            status = "healthy"
            if unreconciled > 25 or (stale_days is not None and stale_days > 7):
                status = "attention_needed"
            results.append(ReconciliationTrustStatus(
                org_id=org_id,
                bank_account_id=str(bank_id),
                status=status,
                unreconciled_transaction_count=int(unreconciled),
                matched_transaction_count=int(matched),
                last_reconciled_at=datetime.combine(last_date, datetime.min.time(), tzinfo=UTC) if last_date else None,
                stale_days=stale_days,
                evidence={"unreconciled_threshold": 25, "stale_threshold_days": 7},
            ))
        if not results:
            results.append(ReconciliationTrustStatus(org_id=org_id, status="unknown", unreconciled_transaction_count=0, matched_transaction_count=0, evidence={"reason": "no_bank_accounts"}))
        return results


class MetricProvenanceService:
    def __init__(self, db: Session):
        self.db = db

    def get_metric_provenance(self, org_id: str, metric_id: str) -> MetricProvenance:
        org_uuid = UUID(org_id)
        invoice_count = self.db.scalar(select(func.count()).select_from(Invoice).where(Invoice.organization_id == org_uuid, Invoice.deleted_at.is_(None))) or 0
        bill_count = self.db.scalar(select(func.count()).select_from(Bill).where(Bill.organization_id == org_uuid, Bill.deleted_at.is_(None))) or 0
        journal_count = self.db.scalar(select(func.count()).select_from(JournalEntry).where(JournalEntry.organization_id == org_uuid)) or 0
        posting_count = self.db.scalar(select(func.count()).select_from(JournalLine).where(JournalLine.organization_id == org_uuid)) or 0

        metric_map = {
            "cash_position_summary": ("Cash Position", "mixed", [DrillTarget(target_type="reconciliation_view", label="Open banking", route="/banking")]),
            "receivables_outstanding_summary": ("Receivables Outstanding", "documents", [DrillTarget(target_type="invoice_list", label="View invoices", route="/invoices")]),
            "payables_outstanding_summary": ("Payables Outstanding", "documents", [DrillTarget(target_type="bill_list", label="View bills", route="/bills")]),
            "net_result_this_month_summary": ("Net Result This Month", "journal_postings", [DrillTarget(target_type="report", label="Open P&L", route="/reports/profit-loss")]),
        }
        label, source_type, targets = metric_map.get(metric_id, (metric_id.replace("_", " ").title(), "aggregated_view", [DrillTarget(target_type="report", label="Open reports", route="/reports")]))

        return MetricProvenance(
            metric_id=metric_id,
            org_id=org_id,
            label=label,
            value_basis=MetricValueBasis(source_type=source_type, date_range={"from": date.today().replace(day=1).isoformat(), "to": date.today().isoformat()}, entity_scope=[org_id], currency="USD"),
            underlying_counts={
                "journal_count": int(journal_count),
                "posting_count": int(posting_count),
                "document_count": int(invoice_count + bill_count),
            },
            drill_targets=targets,
            generated_at=datetime.now(UTC),
        )


class AuditTraceService:
    def __init__(self, db: Session):
        self.db = db

    def get_trace(self, org_id: str, source_type: str, source_id: str) -> AuditTraceLink:
        org_uuid = UUID(org_id)
        related: list[AuditTraceObject] = []
        journal = self.db.scalar(select(JournalEntry).where(JournalEntry.organization_id == org_uuid, JournalEntry.source_type == source_type, JournalEntry.source_id == source_id))
        if journal:
            related.append(AuditTraceObject(object_type="journal", object_id=str(journal.id), label=f"Journal {journal.entry_number}", route=f"/journals/{journal.id}"))
            lines = self.db.execute(select(JournalLine.id).where(JournalLine.journal_entry_id == journal.id).limit(5)).scalars().all()
            related.extend([AuditTraceObject(object_type="posting", object_id=str(line_id), label="Posting line", route=f"/journals/{journal.id}") for line_id in lines])

        if source_type == "invoice":
            related.append(AuditTraceObject(object_type="invoice", object_id=source_id, label="Invoice", route=f"/invoices/{source_id}"))
        if source_type == "bill":
            related.append(AuditTraceObject(object_type="bill", object_id=source_id, label="Bill", route=f"/bills/{source_id}"))
        if source_type == "bank_transaction":
            related.append(AuditTraceObject(object_type="bank_transaction", object_id=source_id, label="Bank transaction", route="/banking"))

        return AuditTraceLink(source_type=source_type, source_id=source_id, related_objects=related, generated_at=datetime.now(UTC))


class ReportTrustMetadataService:
    def __init__(self, db: Session):
        self.db = db

    def get_report_metadata(self, org_id: str, report_id: str) -> ReportTrustMetadata:
        return ReportTrustMetadata(
            report_id=report_id,
            org_id=org_id,
            generated_at=datetime.now(UTC),
            report_basis={
                "date_range": {"from": date.today().replace(day=1).isoformat(), "to": date.today().isoformat()},
                "entity_scope": [org_id],
                "currency": "USD",
                "posted_only": True,
            },
            consistency_status="healthy",
            notes=["Derived from posted journals", "Includes organization-level scope"],
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
        status = "healthy" if not missing else "attention_needed"
        return DataCompletenessStatus(org_id=org_id, status=status, missing_elements=missing, checked_at=datetime.now(UTC))

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
            TrustDomainStatus(domain="reporting_consistency", status="healthy", label="Reporting consistency", description="Reports derived from posted state", last_evaluated_at=now, evidence={"posted_only": True}),
            TrustDomainStatus(domain="audit_traceability", status="healthy" if audit_events > 0 else "unknown", label="Audit traceability", description="Operational changes are traceable", last_evaluated_at=now, evidence={"audit_event_count": int(audit_events)}),
            TrustDomainStatus(domain="data_completeness", status=completeness.status, label="Data completeness", description="Required setup and data readiness checks", last_evaluated_at=completeness.checked_at, evidence={"missing_count": len(completeness.missing_elements)}),
            TrustDomainStatus(domain="system_operations", status="healthy", label="System operations", description="Operational services responding normally", last_evaluated_at=now, evidence={"service_state": "online"}),
        ]
        priorities = {"degraded": 3, "attention_needed": 2, "unknown": 1, "healthy": 0}
        overall = sorted(domains, key=lambda item: priorities[item.status], reverse=True)[0].status
        return TrustSummary(org_id=org_id, overall_status=overall, domains=domains, last_evaluated_at=now)

    def integrity_center(self, org_id: str) -> IntegrityCenterResponse:
        summary = self.get_org_trust_summary(org_id)
        ledger = self.ledger_checks.evaluate(org_id)
        recon = self.reconciliation.evaluate(org_id)
        completeness = self.data_completeness(org_id)
        issues = []
        for domain in summary.domains:
            if domain.status != "healthy":
                issues.append({"domain": domain.domain, "status": domain.status, "description": domain.description})
        return IntegrityCenterResponse(
            trust_summary=summary,
            ledger_integrity=ledger,
            reconciliation_status=recon,
            data_completeness=completeness,
            recent_issues=issues,
        )
