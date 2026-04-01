from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import OnboardingPath, OnboardingPersona, OnboardingTaskStatus
from app.core.exceptions import bad_request, forbidden
from app.db.models.accounting import Account, JournalEntry
from app.db.models.ap import Bill, Supplier
from app.db.models.ar import Customer, Invoice
from app.db.models.audit import AuditLog
from app.db.models.banking import BankAccount
from app.db.models.onboarding import OnboardingTaskProgress, OrgOnboardingStatus, UserOnboardingProfile
from app.db.models.organization import Organization, OrganizationSettings
from app.onboarding.domain.steps import PERSONA_PRIORITIES, TASK_DEFINITIONS

UTC = timezone.utc


class OnboardingService:
    def __init__(self, db: Session):
        self.db = db

    def _require_org_access(self, organization_id: str, current_user) -> None:
        allowed = {str(m.organization_id) for m in getattr(current_user, "memberships", [])}
        if organization_id not in allowed:
            raise forbidden("User is not a member of this organization")

    def _get_or_create_profile(self, organization_id: str, user_id: str) -> UserOnboardingProfile:
        profile = self.db.scalar(
            select(UserOnboardingProfile).where(
                UserOnboardingProfile.organization_id == organization_id,
                UserOnboardingProfile.user_id == user_id,
            )
        )
        if profile:
            return profile

        profile = UserOnboardingProfile(
            organization_id=organization_id,
            user_id=user_id,
            started_at=datetime.now(UTC),
            dismissed_prompts=[],
            current_step_key="entry",
        )
        self.db.add(profile)
        self.db.flush()
        return profile

    def _get_task_progress(self, organization_id: str, user_id: str) -> dict[str, OnboardingTaskProgress]:
        rows = self.db.scalars(
            select(OnboardingTaskProgress).where(
                OnboardingTaskProgress.organization_id == organization_id,
                OnboardingTaskProgress.user_id == user_id,
            )
        ).all()
        return {row.task_key: row for row in rows}

    def _readiness(self, organization_id: str) -> dict[str, bool | int]:
        org = self.db.scalar(select(Organization).where(Organization.id == organization_id))
        settings = self.db.scalar(select(OrganizationSettings).where(OrganizationSettings.organization_id == organization_id))
        if not org:
            raise bad_request("Organization not found")

        account_count = self.db.scalar(select(func.count()).select_from(Account).where(Account.organization_id == organization_id)) or 0
        tax_ready = bool(settings and settings.tax_enabled)
        bank_count = self.db.scalar(select(func.count()).select_from(BankAccount).where(BankAccount.organization_id == organization_id)) or 0
        has_invoice = (self.db.scalar(select(func.count()).select_from(Invoice).where(Invoice.organization_id == organization_id)) or 0) > 0
        has_bill = (self.db.scalar(select(func.count()).select_from(Bill).where(Bill.organization_id == organization_id)) or 0) > 0
        has_journal = (self.db.scalar(select(func.count()).select_from(JournalEntry).where(JournalEntry.organization_id == organization_id)) or 0) > 0
        has_customer = (self.db.scalar(select(func.count()).select_from(Customer).where(Customer.organization_id == organization_id)) or 0) > 0
        has_supplier = (self.db.scalar(select(func.count()).select_from(Supplier).where(Supplier.organization_id == organization_id)) or 0) > 0
        viewed_report = (self.db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.organization_id == organization_id, AuditLog.action == "onboarding.report.viewed")) or 0) > 0
        exported = (self.db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.organization_id == organization_id, AuditLog.action == "onboarding.export.completed")) or 0) > 0

        basics = bool(org.name and org.base_currency and org.fiscal_year_start_month and org.fiscal_year_start_day)
        accounting_config = account_count > 0 and tax_ready
        first_tx = has_invoice or has_bill or has_journal
        operations = bank_count > 0 and first_tx and (has_customer or has_supplier)
        tier = 0
        if basics and accounting_config:
            tier = 1
        if tier >= 1 and operations:
            tier = 2
        if tier >= 2 and viewed_report:
            tier = 3
        return {
            "organization_basics_complete": basics,
            "fiscal_configuration_complete": bool(org.fiscal_year_start_month and org.fiscal_year_start_day),
            "chart_of_accounts_ready": account_count > 0,
            "tax_setup_ready": tax_ready,
            "bank_setup_ready": bank_count > 0,
            "first_transaction_exists": first_tx,
            "first_report_available": viewed_report,
            "first_export_done": exported,
            "counterparty_exists": has_customer or has_supplier,
            "completion_tier": tier,
        }

    def _sync_org_status(self, organization_id: str, readiness: dict[str, bool | int]) -> OrgOnboardingStatus:
        status = self.db.scalar(select(OrgOnboardingStatus).where(OrgOnboardingStatus.organization_id == organization_id))
        if not status:
            status = OrgOnboardingStatus(organization_id=organization_id)
            self.db.add(status)
        status.basics_complete = bool(readiness["organization_basics_complete"])
        status.accounting_config_complete = bool(readiness["chart_of_accounts_ready"] and readiness["tax_setup_ready"])
        status.operations_ready = bool(readiness["bank_setup_ready"] and readiness["counterparty_exists"])
        status.first_transaction_recorded = bool(readiness["first_transaction_exists"])
        status.first_report_viewed = bool(readiness["first_report_available"])
        status.first_export_done = bool(readiness["first_export_done"])
        status.completion_tier = int(readiness["completion_tier"])
        status.readiness_cache = readiness
        self.db.flush()
        return status

    def get_status(self, organization_id: str, current_user):
        self._require_org_access(organization_id, current_user)
        profile = self._get_or_create_profile(organization_id, str(current_user.id))
        task_progress = self._get_task_progress(organization_id, str(current_user.id))
        readiness = self._readiness(organization_id)
        self._sync_org_status(organization_id, readiness)

        prioritized = set(PERSONA_PRIORITIES.get((profile.selected_persona or OnboardingPersona.EXPLORING).value, ()))
        tasks = []
        completed_required = 0
        total_required = 0
        for task in TASK_DEFINITIONS:
            if task.required:
                total_required += 1
            progress = task_progress.get(task.key)
            status = progress.status.value if progress else OnboardingTaskStatus.PENDING.value
            blocked = any(task_progress.get(dep, None) is None or task_progress[dep].status != OnboardingTaskStatus.COMPLETED for dep in task.depends_on)
            if task.required and status == OnboardingTaskStatus.COMPLETED.value:
                completed_required += 1
            tasks.append(
                {
                    "key": task.key,
                    "title": task.title,
                    "description": task.description,
                    "stage": task.stage,
                    "required": task.required,
                    "status": status,
                    "blocked": blocked,
                    "depends_on": list(task.depends_on),
                    "route": task.route,
                    "persona_priority": task.key in prioritized,
                    "permissions": list(task.permissions),
                }
            )

        progress_pct = int((completed_required / total_required) * 100) if total_required else 100
        next_task = next((task for task in tasks if task["status"] == "pending" and not task["blocked"]), None)
        profile.current_step_key = next_task["key"] if next_task else "complete"
        profile.completion_tier = int(readiness["completion_tier"])
        if int(readiness["completion_tier"]) >= 2 and not profile.completed_at:
            profile.completed_at = datetime.now(UTC)
        self.db.commit()

        return {
            "organization_id": organization_id,
            "path": profile.selected_path,
            "persona": profile.selected_persona,
            "current_step": profile.current_step_key,
            "progress_percent": progress_pct,
            "completion_tier": readiness["completion_tier"],
            "readiness": readiness,
            "tasks": tasks,
            "next_recommended_action": next_task,
            "dismissed_prompts": profile.dismissed_prompts,
            "is_demo_org": bool(self.db.scalar(select(Organization.is_demo).where(Organization.id == organization_id))),
        }

    def select_path(self, organization_id: str, current_user, path: OnboardingPath):
        self._require_org_access(organization_id, current_user)
        profile = self._get_or_create_profile(organization_id, str(current_user.id))
        profile.selected_path = path
        profile.started_at = profile.started_at or datetime.now(UTC)
        self.db.add(AuditLog(organization_id=organization_id, actor_user_id=current_user.id, action="onboarding.path.selected", entity_type="onboarding", entity_id=organization_id, metadata_json={"path": path.value}, created_at=datetime.now(UTC)))
        self.db.commit()
        return self.get_status(organization_id, current_user)

    def select_persona(self, organization_id: str, current_user, persona: OnboardingPersona):
        self._require_org_access(organization_id, current_user)
        profile = self._get_or_create_profile(organization_id, str(current_user.id))
        profile.selected_persona = persona
        self.db.add(AuditLog(organization_id=organization_id, actor_user_id=current_user.id, action="onboarding.persona.selected", entity_type="onboarding", entity_id=organization_id, metadata_json={"persona": persona.value}, created_at=datetime.now(UTC)))
        self.db.commit()
        return self.get_status(organization_id, current_user)

    def update_task(self, organization_id: str, current_user, task_key: str, status: OnboardingTaskStatus):
        self._require_org_access(organization_id, current_user)
        if task_key not in {item.key for item in TASK_DEFINITIONS}:
            raise bad_request("Unknown onboarding task")
        row = self.db.scalar(
            select(OnboardingTaskProgress).where(
                OnboardingTaskProgress.organization_id == organization_id,
                OnboardingTaskProgress.user_id == current_user.id,
                OnboardingTaskProgress.task_key == task_key,
            )
        )
        if not row:
            row = OnboardingTaskProgress(organization_id=organization_id, user_id=current_user.id, task_key=task_key)
            self.db.add(row)
        row.status = status
        now = datetime.now(UTC)
        if status == OnboardingTaskStatus.COMPLETED:
            row.completed_at = now
        if status == OnboardingTaskStatus.SKIPPED:
            row.skipped_at = now
        self.db.add(AuditLog(organization_id=organization_id, actor_user_id=current_user.id, action="onboarding.task.updated", entity_type="onboarding_task", entity_id=task_key, metadata_json={"status": status.value}, created_at=now))
        self.db.commit()
        return self.get_status(organization_id, current_user)

    def dismiss_prompt(self, organization_id: str, current_user, prompt_key: str):
        self._require_org_access(organization_id, current_user)
        profile = self._get_or_create_profile(organization_id, str(current_user.id))
        prompts = set(profile.dismissed_prompts or [])
        prompts.add(prompt_key)
        profile.dismissed_prompts = sorted(prompts)
        self.db.commit()
        return self.get_status(organization_id, current_user)

    def resume(self, organization_id: str, current_user, source: str | None = None):
        self._require_org_access(organization_id, current_user)
        profile = self._get_or_create_profile(organization_id, str(current_user.id))
        profile.last_resume_context = source
        self.db.commit()
        status = self.get_status(organization_id, current_user)
        return {"resume_to": status.get("next_recommended_action", {}).get("route") or "/setup", "status": status}
