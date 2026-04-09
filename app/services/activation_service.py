from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import AccountType, BankTransactionStatus
from app.db.models.accounting import Account
from app.db.models.ap import Bill, Supplier
from app.db.models.ar import Customer, Invoice
from app.db.models.audit import AuditLog
from app.db.models.banking import BankAccount, BankTransaction
from app.db.models.membership import OrganizationUser
from app.db.models.onboarding import OrgOnboardingStatus, UserOnboardingProfile
from app.db.models.organization import Organization, OrganizationSettings
from app.schemas.activation import (
    ActivationChecklistItemState,
    ActivationChecklistSnapshot,
    ActivationMilestones,
    ActivationPresentationPreferences,
)

UTC = timezone.utc
CHECKLIST_VERSION = "v1"


class ActivationDefinitionRegistry:
    items = [
        ("org_created", True),
        ("settings_reviewed", True),
        ("chart_of_accounts_ready", True),
        ("bank_account_added", False),
        ("customer_added", False),
        ("supplier_added", False),
        ("first_invoice_created", False),
        ("first_bill_created", False),
        ("bank_import_started", False),
        ("first_reconciliation_started", False),
        ("teammate_invited", False),
    ]

    dependencies = {
        "settings_reviewed": ["org_created"],
        "chart_of_accounts_ready": ["org_created"],
        "bank_account_added": ["org_created"],
        "customer_added": ["org_created"],
        "supplier_added": ["org_created"],
        "first_invoice_created": ["chart_of_accounts_ready"],
        "first_bill_created": ["chart_of_accounts_ready"],
        "bank_import_started": ["bank_account_added"],
        "first_reconciliation_started": ["bank_account_added"],
        "teammate_invited": ["org_created"],
    }


class ActivationProgressRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_status(self, org_uuid: UUID) -> OrgOnboardingStatus:
        status = self.db.scalar(select(OrgOnboardingStatus).where(OrgOnboardingStatus.organization_id == org_uuid))
        if not status:
            status = OrgOnboardingStatus(organization_id=org_uuid)
            self.db.add(status)
            self.db.flush()
        return status

    def get_previous_snapshot(self, status_row: OrgOnboardingStatus) -> dict[str, Any]:
        if not isinstance(status_row.readiness_cache, dict):
            return {}
        snapshot = status_row.readiness_cache.get("activation_snapshot")
        return snapshot if isinstance(snapshot, dict) else {}

    def save_snapshot(self, status_row: OrgOnboardingStatus, snapshot: ActivationChecklistSnapshot):
        cache = status_row.readiness_cache if isinstance(status_row.readiness_cache, dict) else {}
        cache["activation_snapshot"] = snapshot.model_dump(mode="json")
        status_row.readiness_cache = cache


class ActivationEventEmitter:
    def __init__(self, db: Session):
        self.db = db

    def emit_transition_events(self, org_uuid: UUID, previous: dict[str, Any], snapshot: ActivationChecklistSnapshot):
        previous_items = {item.get("item_id"): item.get("status") for item in previous.get("items", []) if isinstance(item, dict)}
        now = datetime.now(UTC)

        for item in snapshot.items:
            if previous_items.get(item.item_id) != "complete" and item.status == "complete":
                self.db.add(AuditLog(
                    organization_id=org_uuid,
                    actor_user_id=None,
                    action="activation.checklist_item.completed",
                    entity_type="activation_item",
                    entity_id=item.item_id,
                    metadata_json={
                        "item_id": item.item_id,
                        "checklist_version": CHECKLIST_VERSION,
                        "completion_source": item.completion_source,
                    },
                    created_at=now,
                ))

        previous_milestones = previous.get("milestones", {}) if isinstance(previous.get("milestones"), dict) else {}
        for milestone, reached in snapshot.milestones.model_dump().items():
            if reached and not previous_milestones.get(milestone):
                self.db.add(AuditLog(
                    organization_id=org_uuid,
                    actor_user_id=None,
                    action="activation.milestone.reached",
                    entity_type="activation_milestone",
                    entity_id=milestone,
                    metadata_json={"milestone": milestone, "checklist_version": CHECKLIST_VERSION},
                    created_at=now,
                ))

        if previous.get("status") != "completed" and snapshot.status == "completed":
            self.db.add(AuditLog(
                organization_id=org_uuid,
                actor_user_id=None,
                action="activation.completed",
                entity_type="activation",
                entity_id=str(org_uuid),
                metadata_json={
                    "checklist_version": CHECKLIST_VERSION,
                    "completed_item_ids": [i.item_id for i in snapshot.items if i.status == "complete"],
                },
                created_at=now,
            ))


class ActivationEvaluationService:
    def __init__(self, db: Session):
        self.db = db

    def _sticky_complete(self, previous: dict[str, Any], item_id: str, completed_now: bool) -> bool:
        previous_items = previous.get("items", []) if isinstance(previous, dict) else []
        previously_complete = any((item.get("item_id") == item_id and item.get("status") == "complete") for item in previous_items if isinstance(item, dict))
        return completed_now or previously_complete

    def _evaluate_raw(self, org_uuid: UUID) -> dict[str, tuple[bool, dict[str, Any], str]]:
        org = self.db.scalar(select(Organization).where(Organization.id == org_uuid))
        settings = self.db.scalar(select(OrganizationSettings).where(OrganizationSettings.organization_id == org_uuid))
        settings_reviewed_event = self.db.scalar(
            select(func.count()).select_from(AuditLog).where(
                AuditLog.organization_id == org_uuid,
                AuditLog.action == "activation.settings_reviewed",
            )
        ) or 0

        account_types = self.db.execute(select(Account.account_type).where(Account.organization_id == org_uuid, Account.is_active.is_(True))).scalars().all()
        required_categories = {
            AccountType.ASSET.value,
            AccountType.LIABILITY.value,
            AccountType.EQUITY.value,
            AccountType.REVENUE.value,
            AccountType.EXPENSE.value,
        }
        present_categories = {str(account_type) for account_type in account_types}

        bank_account_count = self.db.scalar(select(func.count()).select_from(BankAccount).where(BankAccount.organization_id == org_uuid, BankAccount.is_active.is_(True))) or 0
        customer_count = self.db.scalar(select(func.count()).select_from(Customer).where(Customer.organization_id == org_uuid, Customer.is_active.is_(True))) or 0
        supplier_count = self.db.scalar(select(func.count()).select_from(Supplier).where(Supplier.organization_id == org_uuid, Supplier.is_active.is_(True))) or 0
        invoice_count = self.db.scalar(select(func.count()).select_from(Invoice).where(Invoice.organization_id == org_uuid, Invoice.deleted_at.is_(None))) or 0
        bill_count = self.db.scalar(select(func.count()).select_from(Bill).where(Bill.organization_id == org_uuid, Bill.deleted_at.is_(None))) or 0
        imported_tx_count = self.db.scalar(select(func.count()).select_from(BankTransaction).where(BankTransaction.organization_id == org_uuid, BankTransaction.deleted_at.is_(None))) or 0
        reconciled_tx_count = self.db.scalar(
            select(func.count()).select_from(BankTransaction).where(
                BankTransaction.organization_id == org_uuid,
                BankTransaction.deleted_at.is_(None),
                BankTransaction.status == BankTransactionStatus.RECONCILED,
            )
        ) or 0
        member_count = self.db.scalar(select(func.count()).select_from(OrganizationUser).where(OrganizationUser.organization_id == org_uuid)) or 0

        return {
            "org_created": (bool(org), {"org_exists": bool(org)}, "system_detected"),
            "settings_reviewed": (bool(settings and settings_reviewed_event > 0), {"required_fields_present": bool(settings), "settings_reviewed_event_count": int(settings_reviewed_event)}, "user_action"),
            "chart_of_accounts_ready": (bool(len(account_types) > 0 and required_categories.issubset(present_categories)), {"account_count": len(account_types), "has_required_categories": required_categories.issubset(present_categories)}, "system_detected"),
            "bank_account_added": (bank_account_count > 0, {"active_bank_account_count": int(bank_account_count)}, "system_detected"),
            "customer_added": (customer_count > 0, {"active_customer_count": int(customer_count)}, "system_detected"),
            "supplier_added": (supplier_count > 0, {"active_supplier_count": int(supplier_count)}, "system_detected"),
            "first_invoice_created": (invoice_count > 0, {"invoice_count": int(invoice_count)}, "system_detected"),
            "first_bill_created": (bill_count > 0, {"bill_count": int(bill_count)}, "system_detected"),
            "bank_import_started": (imported_tx_count > 0, {"imported_transaction_count": int(imported_tx_count)}, "backend_job"),
            "first_reconciliation_started": (reconciled_tx_count > 0, {"reconciled_transaction_count": int(reconciled_tx_count)}, "system_detected"),
            "teammate_invited": (member_count > 1, {"additional_member_count": max(int(member_count) - 1, 0)}, "system_detected"),
        }

    def build_snapshot(self, organization_id: str, previous: dict[str, Any], status_row: OrgOnboardingStatus) -> ActivationChecklistSnapshot:
        org_uuid = UUID(organization_id)
        evaluated = self._evaluate_raw(org_uuid)
        completed_ids: list[str] = []
        items: list[ActivationChecklistItemState] = []

        for item_id, _required in ActivationDefinitionRegistry.items:
            complete_now, evidence, source = evaluated[item_id]
            final_complete = self._sticky_complete(previous, item_id, complete_now)
            status = "complete" if final_complete else "pending"
            blocking_reasons: list[str] = []
            for dependency in ActivationDefinitionRegistry.dependencies.get(item_id, []):
                if dependency not in completed_ids and status != "complete":
                    status = "blocked"
                    blocking_reasons.append(f"blocked_by:{dependency}")
            if status == "complete":
                completed_ids.append(item_id)

            items.append(ActivationChecklistItemState(
                item_id=item_id,
                version=CHECKLIST_VERSION,
                status=status,
                completion_source=source if status == "complete" else None,
                blocking_reasons=blocking_reasons,
                evidence=evidence,
            ))

        completed_set = {item.item_id for item in items if item.status == "complete"}
        foundation_ok = all(item in completed_set for item in ["org_created", "settings_reviewed", "chart_of_accounts_ready"])
        operational_ok = any(item in completed_set for item in ["bank_account_added", "customer_added", "supplier_added"])
        workflow_ok = any(item in completed_set for item in ["first_invoice_created", "first_bill_created", "bank_import_started", "first_reconciliation_started"])

        status = "completed" if (foundation_ok and operational_ok and workflow_ok) else "in_progress" if completed_set else "not_started"

        recommendation_order = [
            "settings_reviewed",
            "chart_of_accounts_ready",
            "bank_account_added",
            "customer_added",
            "supplier_added",
            "first_invoice_created",
            "first_bill_created",
            "bank_import_started",
            "first_reconciliation_started",
            "teammate_invited",
        ]

        return ActivationChecklistSnapshot(
            org_id=organization_id,
            workspace_id=organization_id,
            checklist_version=CHECKLIST_VERSION,
            status=status,
            completion_percent=int((len(completed_set) / len(items)) * 100) if items else 0,
            completed_item_count=len(completed_set),
            total_visible_item_count=len(items),
            required_completed_count=len([item for item, required in ActivationDefinitionRegistry.items if required and item in completed_set]),
            required_total_count=len([item for item, required in ActivationDefinitionRegistry.items if required]),
            items=items,
            milestones=ActivationMilestones(
                initial_setup_complete=foundation_ok,
                first_operational_record_created=operational_ok,
                first_transaction_workflow_started=workflow_ok,
                first_financial_review_completed=bool(status_row.first_report_viewed),
            ),
            recommended_next_item_ids=[item_id for item_id in recommendation_order if item_id not in completed_set][:3],
            activated_at=(
                datetime.now(UTC)
                if status == "completed" and previous.get("status") != "completed"
                else previous.get("activated_at")
            ),
            first_entered_activation_at=previous.get("first_entered_activation_at") or datetime.now(UTC),
            last_evaluated_at=datetime.now(UTC),
        )


class ActivationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ActivationProgressRepository(db)
        self.evaluator = ActivationEvaluationService(db)
        self.emitter = ActivationEventEmitter(db)

    def evaluate_snapshot(self, organization_id: str, *, user_id: str | None = None) -> ActivationChecklistSnapshot:
        org_uuid = UUID(organization_id)
        status_row = self.repo.get_or_create_status(org_uuid)
        previous = self.repo.get_previous_snapshot(status_row)
        snapshot = self.evaluator.build_snapshot(organization_id, previous, status_row)
        self.repo.save_snapshot(status_row, snapshot)
        self.emitter.emit_transition_events(org_uuid, previous, snapshot)
        self.db.commit()
        return snapshot

    def confirm_settings_reviewed(self, organization_id: str, user_id: str):
        org_uuid = UUID(organization_id)
        self.db.add(AuditLog(
            organization_id=org_uuid,
            actor_user_id=UUID(user_id),
            action="activation.settings_reviewed",
            entity_type="activation",
            entity_id=organization_id,
            metadata_json={"checklist_version": CHECKLIST_VERSION},
            created_at=datetime.now(UTC),
        ))
        self.db.commit()
        return self.evaluate_snapshot(organization_id, user_id=user_id)

    def get_presentation_preferences(self, organization_id: str, user_id: str) -> ActivationPresentationPreferences:
        profile = self.db.scalar(select(UserOnboardingProfile).where(UserOnboardingProfile.organization_id == UUID(organization_id), UserOnboardingProfile.user_id == UUID(user_id)))
        prompts = set(profile.dismissed_prompts or []) if profile else set()
        return ActivationPresentationPreferences(
            org_id=organization_id,
            user_id=user_id,
            checklist_dismissed="activation_checklist_dismissed" in prompts,
            app_banner_dismissed="activation_banner_dismissed" in prompts,
            last_viewed_at=profile.updated_at if profile else None,
            preferred_surface=profile.last_resume_context or "panel" if profile else "panel",
        )

    def update_presentation_preferences(self, organization_id: str, user_id: str, *, checklist_dismissed: bool | None = None, app_banner_dismissed: bool | None = None, preferred_surface: str | None = None):
        profile = self.db.scalar(select(UserOnboardingProfile).where(UserOnboardingProfile.organization_id == UUID(organization_id), UserOnboardingProfile.user_id == UUID(user_id)))
        if not profile:
            profile = UserOnboardingProfile(organization_id=UUID(organization_id), user_id=UUID(user_id), dismissed_prompts=[])
            self.db.add(profile)
            self.db.flush()

        prompts = set(profile.dismissed_prompts or [])
        if checklist_dismissed is not None:
            if checklist_dismissed:
                prompts.add("activation_checklist_dismissed")
            else:
                prompts.discard("activation_checklist_dismissed")

        if app_banner_dismissed is not None:
            if app_banner_dismissed:
                prompts.add("activation_banner_dismissed")
            else:
                prompts.discard("activation_banner_dismissed")

        profile.dismissed_prompts = sorted(prompts)
        if preferred_surface:
            profile.last_resume_context = preferred_surface
        self.db.commit()
        return self.get_presentation_preferences(organization_id, user_id)
