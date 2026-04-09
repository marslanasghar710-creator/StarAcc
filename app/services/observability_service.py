from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
import hashlib
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.ap import Bill
from app.db.models.ar import Invoice
from app.db.models.audit import AuditLog
from app.db.models.banking import BankTransaction
from app.db.models.integrations import IntegrationConnection, IntegrationSyncRun
from app.db.models.onboarding import OrgOnboardingStatus
from app.schemas.observability import (
    AlertCandidate,
    AttentionQueueItem,
    ErrorRecord,
    JobExecutionRecord,
    OrgHealthSnapshot,
    PerformanceMetric,
    PlatformHealthDomainSummary,
    PlatformHealthSummary,
    QueryPerformanceRecord,
    TelemetryEnvelope,
)
from app.services.billing_service import BillingService

UTC = timezone.utc


class TelemetryService:
    def __init__(self, db: Session):
        self.db = db

    def record(self, event: TelemetryEnvelope):
        self.db.add(
            AuditLog(
                organization_id=event.org_id,
                actor_user_id=event.user_id,
                action=f"observability.telemetry.{event.event_type}",
                entity_type="observability_telemetry",
                entity_id=event.event_id,
                metadata_json=event.model_dump(mode="json"),
                created_at=datetime.now(UTC),
            )
        )
        self.db.commit()


class ErrorTrackingService:
    def __init__(self, db: Session):
        self.db = db

    def record(self, record: ErrorRecord):
        self.db.add(
            AuditLog(
                organization_id=record.org_id,
                actor_user_id=record.user_id,
                action=f"observability.error.{record.error_class}",
                entity_type="observability_error",
                entity_id=record.error_id,
                metadata_json=record.model_dump(mode="json"),
                created_at=datetime.now(UTC),
            )
        )
        self.db.commit()


class PerformanceMetricsService:
    def __init__(self, db: Session):
        self.db = db

    def record(self, metric: PerformanceMetric):
        self.db.add(
            AuditLog(
                organization_id=metric.org_id,
                actor_user_id=None,
                action="observability.performance.recorded",
                entity_type="observability_performance",
                entity_id=metric.metric_id,
                metadata_json=metric.model_dump(mode="json"),
                created_at=datetime.now(UTC),
            )
        )
        self.db.commit()


class QueryObservabilityService:
    def __init__(self, db: Session):
        self.db = db

    def record(self, rec: QueryPerformanceRecord):
        self.db.add(
            AuditLog(
                organization_id=rec.org_id,
                actor_user_id=None,
                action="observability.query.recorded",
                entity_type="observability_query",
                entity_id=f"{rec.query_name}:{int(datetime.now(UTC).timestamp())}",
                metadata_json=rec.model_dump(mode="json"),
                created_at=datetime.now(UTC),
            )
        )
        self.db.commit()


class JobObservabilityService:
    def __init__(self, db: Session):
        self.db = db

    def list_recent_jobs(self, organization_id: str, limit: int = 100) -> list[JobExecutionRecord]:
        runs = list(
            self.db.scalars(
                select(IntegrationSyncRun)
                .join(IntegrationConnection, IntegrationConnection.id == IntegrationSyncRun.connection_id)
                .where(IntegrationConnection.organization_id == organization_id)
                .order_by(IntegrationSyncRun.created_at.desc())
                .limit(limit)
            ).all()
        )
        out: list[JobExecutionRecord] = []
        for run in runs:
            status_map = {
                "pending": "queued",
                "running": "running",
                "succeeded": "succeeded",
                "partial": "partial",
                "failed": "failed",
            }
            started_at = run.started_at or run.created_at.isoformat()
            finished_at = run.completed_at
            duration_ms = None
            if run.started_at and run.completed_at:
                try:
                    duration_ms = (datetime.fromisoformat(run.completed_at) - datetime.fromisoformat(run.started_at)).total_seconds() * 1000
                except Exception:
                    duration_ms = None
            out.append(
                JobExecutionRecord(
                    job_execution_id=str(run.id),
                    job_type=f"integration_sync:{run.provider_key}",
                    domain="integrations",
                    org_id=organization_id,
                    related_entity_id=str(run.connection_id),
                    started_at=started_at,
                    finished_at=finished_at,
                    status=status_map.get(run.status.value if hasattr(run.status, "value") else str(run.status), "failed"),
                    attempts=1,
                    max_attempts=3,
                    duration_ms=duration_ms,
                    error_code="integration_sync_partial" if run.records_failed else None,
                    error_class="job_failure" if run.records_failed else None,
                    summary={
                        "records_seen": run.records_seen,
                        "records_created": run.records_created,
                        "records_failed": run.records_failed,
                        "provider_key": run.provider_key,
                    },
                )
            )
        return out


class OrgHealthService:
    def __init__(self, db: Session):
        self.db = db

    def get_org_health(self, org_id: str) -> OrgHealthSnapshot:
        now = datetime.now(UTC)
        since_24h = now - timedelta(hours=24)
        since_30d = now - timedelta(days=30)

        onboarding = self.db.scalar(select(OrgOnboardingStatus).where(OrgOnboardingStatus.organization_id == org_id))
        activation_status = "not_started"
        if onboarding and isinstance(onboarding.readiness_cache, dict):
            activation_status = (onboarding.readiness_cache.get("activation_snapshot", {}) or {}).get("status", "not_started")

        try:
            commercial = BillingService(self.db).get_commercial_state(org_id)
            sub_status = str(commercial["subscription"].status.value if hasattr(commercial["subscription"].status, "value") else commercial["subscription"].status)
            billing_status = "trial" if sub_status == "trialing" else "past_due" if sub_status in {"unpaid", "expired"} else "canceled" if sub_status == "canceled" else "active"
        except Exception:
            billing_status = "unknown"

        unreconciled_count = self.db.scalar(
            select(func.count()).select_from(BankTransaction).where(BankTransaction.organization_id == org_id, BankTransaction.status == "unreconciled", BankTransaction.deleted_at.is_(None))
        ) or 0
        rec_status = "healthy" if unreconciled_count < 20 else "attention_needed" if unreconciled_count < 100 else "degraded"

        failing_sync_count = self.db.scalar(
            select(func.count())
            .select_from(IntegrationSyncRun)
            .join(IntegrationConnection, IntegrationConnection.id == IntegrationSyncRun.connection_id)
            .where(IntegrationConnection.organization_id == org_id, IntegrationSyncRun.status.in_(["failed", "partial"]))
        ) or 0
        last_sync_issue = self.db.scalar(
            select(func.max(IntegrationSyncRun.created_at))
            .select_from(IntegrationSyncRun)
            .join(IntegrationConnection, IntegrationConnection.id == IntegrationSyncRun.connection_id)
            .where(IntegrationConnection.organization_id == org_id, IntegrationSyncRun.status.in_(["failed", "partial"]))
        )
        integration_status = "healthy" if failing_sync_count == 0 else "attention_needed" if failing_sync_count < 5 else "degraded"

        trust_issues = self.db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.organization_id == org_id, AuditLog.action.like("trust.%issue%"), AuditLog.created_at >= since_30d)) or 0
        trust_status = "healthy" if trust_issues == 0 else "attention_needed"

        error_logs = list(
            self.db.scalars(
                select(AuditLog).where(
                    AuditLog.organization_id == org_id,
                    AuditLog.entity_type.in_(["observability_error", "integration_sync_run"]),
                    AuditLog.created_at >= since_24h,
                )
            ).all()
        )
        error_count_24h = len(error_logs)
        high_severity_24h = len([e for e in error_logs if isinstance((e.metadata_json or {}).get("severity"), str) and (e.metadata_json or {}).get("severity") in {"high", "critical"}])

        invoices_30d = self.db.scalar(select(func.count()).select_from(Invoice).where(Invoice.organization_id == org_id, Invoice.created_at >= since_30d, Invoice.deleted_at.is_(None))) or 0
        bills_30d = self.db.scalar(select(func.count()).select_from(Bill).where(Bill.organization_id == org_id, Bill.created_at >= since_30d, Bill.deleted_at.is_(None))) or 0
        reports_30d = self.db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.organization_id == org_id, AuditLog.action.like("report.%"), AuditLog.created_at >= since_30d)) or 0
        last_active = self.db.scalar(select(func.max(AuditLog.created_at)).where(AuditLog.organization_id == org_id))

        statuses = [rec_status, integration_status, trust_status]
        if error_count_24h >= 20 or high_severity_24h >= 5:
            statuses.append("degraded")
        if billing_status == "past_due":
            statuses.append("attention_needed")
        overall = "outage" if "outage" in statuses else "degraded" if "degraded" in statuses else "attention_needed" if "attention_needed" in statuses else "healthy"

        snapshot = OrgHealthSnapshot(
            org_id=org_id,
            overall_status=overall,
            activation_status=activation_status,
            billing_status=billing_status,
            reconciliation_attention={"status": rec_status, "unreconciled_count": int(unreconciled_count), "stale_days": None},
            integration_attention={"status": integration_status, "failing_integrations_count": int(failing_sync_count), "last_sync_issue_at": last_sync_issue.isoformat() if last_sync_issue else None},
            trust_attention={"status": trust_status, "open_integrity_issues_count": int(trust_issues)},
            recent_error_summary={"status": "healthy" if error_count_24h == 0 else "attention_needed" if high_severity_24h == 0 else "degraded", "error_count_24h": int(error_count_24h), "high_severity_count_24h": int(high_severity_24h)},
            activity_summary={"last_active_at": last_active.isoformat() if last_active else None, "invoices_30d": int(invoices_30d), "bills_30d": int(bills_30d), "reports_30d": int(reports_30d)},
            last_computed_at=now.isoformat(),
        )
        self.db.add(AuditLog(
            organization_id=org_id,
            actor_user_id=None,
            action="observability.org_health.computed",
            entity_type="observability_org_health",
            entity_id=f"{org_id}:{int(now.timestamp())}",
            metadata_json=snapshot.model_dump(mode="json"),
            created_at=now,
        ))
        self.db.commit()
        return snapshot


class PlatformHealthService:
    DOMAINS = ["api", "database", "jobs", "integrations", "ledger", "reporting", "reconciliation", "auth", "billing", "dashboard", "activation"]

    def __init__(self, db: Session):
        self.db = db

    def get_summary(self, organization_id: str) -> PlatformHealthSummary:
        now = datetime.now(UTC)
        since_24h = now - timedelta(hours=24)
        logs = list(self.db.scalars(select(AuditLog).where(AuditLog.organization_id == organization_id, AuditLog.created_at >= since_24h)).all())

        issues = defaultdict(int)
        last_incident = {}
        for log in logs:
            if isinstance(log.action, str) and ("failed" in log.action or "error" in log.action or "partial" in log.action):
                domain = "api"
                if "integration" in log.action:
                    domain = "integrations"
                elif "billing" in log.action:
                    domain = "billing"
                elif "report" in log.action:
                    domain = "reporting"
                elif "activation" in log.action:
                    domain = "activation"
                issues[domain] += 1
                last_incident[domain] = log.created_at.isoformat()

        domain_rows: list[PlatformHealthDomainSummary] = []
        worst = "healthy"
        for domain in self.DOMAINS:
            count = int(issues.get(domain, 0))
            status = "healthy" if count == 0 else "attention_needed" if count < 5 else "degraded"
            if status == "degraded":
                worst = "degraded"
            elif status == "attention_needed" and worst == "healthy":
                worst = "attention_needed"
            domain_rows.append(PlatformHealthDomainSummary(domain=domain, status=status, issue_count=count, last_incident_at=last_incident.get(domain)))

        return PlatformHealthSummary(overall_status=worst, domains=domain_rows, generated_at=now.isoformat())


class AttentionQueueService:
    def __init__(self, db: Session):
        self.db = db

    def list_queue(self, organization_id: str) -> list[AttentionQueueItem]:
        now = datetime.now(UTC).isoformat()
        queue: list[AttentionQueueItem] = []
        org_health = OrgHealthService(self.db).get_org_health(organization_id)

        if org_health.recent_error_summary.high_severity_count_24h > 0:
            queue.append(AttentionQueueItem(item_id=str(uuid.uuid4()), type="org_error_risk", severity="high", org_id=organization_id, title="High-severity errors detected", description=f"{org_health.recent_error_summary.high_severity_count_24h} high-severity errors in last 24h", action_route=f"/admin/errors?org={organization_id}", created_at=now))
        if org_health.integration_attention.failing_integrations_count > 0:
            queue.append(AttentionQueueItem(item_id=str(uuid.uuid4()), type="integration_failure", severity="medium", org_id=organization_id, title="Integration sync failures", description=f"{org_health.integration_attention.failing_integrations_count} failed or partial runs", action_route=f"/admin/integrations?org={organization_id}", created_at=now))
        if (org_health.reconciliation_attention.unreconciled_count or 0) > 50:
            queue.append(AttentionQueueItem(item_id=str(uuid.uuid4()), type="stale_reconciliation", severity="medium", org_id=organization_id, title="Reconciliation backlog growing", description=f"{org_health.reconciliation_attention.unreconciled_count} unreconciled transactions", action_route=f"/admin/orgs/{organization_id}", created_at=now))
        if org_health.activation_status in {"not_started", "in_progress"}:
            queue.append(AttentionQueueItem(item_id=str(uuid.uuid4()), type="activation_stalled", severity="low", org_id=organization_id, title="Activation not complete", description=f"Activation status is {org_health.activation_status}", action_route=f"/admin/orgs/{organization_id}", created_at=now))
        if org_health.billing_status == "past_due":
            queue.append(AttentionQueueItem(item_id=str(uuid.uuid4()), type="billing_past_due", severity="high", org_id=organization_id, title="Billing past due", description="Subscription is unpaid or expired", action_route=f"/admin/orgs/{organization_id}", created_at=now))
        if org_health.trust_attention.open_integrity_issues_count > 0:
            queue.append(AttentionQueueItem(item_id=str(uuid.uuid4()), type="integrity_issue", severity="high", org_id=organization_id, title="Integrity issues present", description=f"{org_health.trust_attention.open_integrity_issues_count} open integrity issues", action_route=f"/admin/health?org={organization_id}", created_at=now))
        return queue


class AdminObservabilityReadService:
    def __init__(self, db: Session):
        self.db = db

    def list_errors(self, organization_id: str, limit: int = 50) -> list[ErrorRecord]:
        logs = list(self.db.scalars(select(AuditLog).where(AuditLog.organization_id == organization_id, AuditLog.entity_type == "observability_error").order_by(AuditLog.created_at.desc()).limit(limit)).all())
        rows: list[ErrorRecord] = []
        for log in logs:
            meta = log.metadata_json if isinstance(log.metadata_json, dict) else {}
            rows.append(ErrorRecord(**{
                "error_id": meta.get("error_id", str(log.id)),
                "occurred_at": meta.get("occurred_at", log.created_at.isoformat()),
                "domain": meta.get("domain", "api"),
                "error_class": meta.get("error_class", "unknown"),
                "error_code": meta.get("error_code", "unknown_error"),
                "severity": meta.get("severity", "medium"),
                "message": meta.get("message", log.action),
                "request_id": meta.get("request_id"),
                "trace_id": meta.get("trace_id"),
                "org_id": organization_id,
                "user_id": meta.get("user_id"),
                "route": meta.get("route"),
                "operation": meta.get("operation"),
                "retryable": bool(meta.get("retryable", False)),
                "resolved_at": meta.get("resolved_at"),
                "metadata": meta.get("metadata", {}),
            }))
        return rows

    def list_performance(self, organization_id: str, limit: int = 50) -> list[PerformanceMetric]:
        logs = list(self.db.scalars(select(AuditLog).where(AuditLog.organization_id == organization_id, AuditLog.entity_type == "observability_performance").order_by(AuditLog.created_at.desc()).limit(limit)).all())
        items: list[PerformanceMetric] = []
        for log in logs:
            meta = log.metadata_json if isinstance(log.metadata_json, dict) else {}
            try:
                items.append(PerformanceMetric(**meta))
            except Exception:
                continue
        items.sort(key=lambda m: m.duration_ms, reverse=True)
        return items

    def list_query_performance(self, organization_id: str, limit: int = 50) -> list[QueryPerformanceRecord]:
        logs = list(self.db.scalars(select(AuditLog).where(AuditLog.organization_id == organization_id, AuditLog.entity_type == "observability_query").order_by(AuditLog.created_at.desc()).limit(limit)).all())
        items: list[QueryPerformanceRecord] = []
        for log in logs:
            meta = log.metadata_json if isinstance(log.metadata_json, dict) else {}
            try:
                items.append(QueryPerformanceRecord(**meta))
            except Exception:
                continue
        return items

    def list_alert_candidates(self, organization_id: str) -> list[AlertCandidate]:
        perf = self.list_performance(organization_id, limit=100)
        alerts: list[AlertCandidate] = []
        if perf:
            slow = [m for m in perf if m.duration_ms >= 1500]
            if slow:
                alerts.append(AlertCandidate(alert_id=hashlib.md5(f"{organization_id}:slow_ops".encode()).hexdigest(), domain="api", severity="medium", condition=f"{len(slow)} operations exceeded 1500ms", triggered_at=datetime.now(UTC).isoformat(), metadata={"slow_count": len(slow)}))

        jobs = JobObservabilityService(self.db).list_recent_jobs(organization_id, limit=100)
        failed_jobs = [j for j in jobs if j.status in {"failed", "partial"}]
        if len(failed_jobs) >= 3:
            alerts.append(AlertCandidate(alert_id=hashlib.md5(f"{organization_id}:job_failures".encode()).hexdigest(), domain="jobs", severity="high", condition="Repeated job failures detected", triggered_at=datetime.now(UTC).isoformat(), metadata={"failed_jobs": len(failed_jobs)}))
        return alerts
