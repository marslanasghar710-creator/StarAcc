from datetime import datetime, timezone

UTC = timezone.utc
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.core.enums import ProjectStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.membership import MembershipRepository
from app.repositories.orgs import OrganizationRepository
from app.repositories.period_repository import PeriodRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.users import UserRepository
from app.services.inventory_service import InventoryService
from app.services.journal_validation_service import JournalValidationService




ZERO = Decimal("0")
PRECISION = Decimal("0.00000001")
ALLOWED_STATUS_TRANSITIONS = {
    ProjectStatus.DRAFT: {ProjectStatus.DRAFT, ProjectStatus.ACTIVE, ProjectStatus.CANCELLED},
    ProjectStatus.ACTIVE: {ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED},
    ProjectStatus.ON_HOLD: {ProjectStatus.ON_HOLD, ProjectStatus.ACTIVE, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED},
    ProjectStatus.COMPLETED: {ProjectStatus.COMPLETED},
    ProjectStatus.CANCELLED: {ProjectStatus.CANCELLED},
}


class ProjectService:
    def __init__(self, db: Session):
        self.db = db
        self.projects = ProjectRepository(db)
        self.audit = AuditRepository(db)
        self.customers = CustomerRepository(db)
        self.memberships = MembershipRepository(db)
        self.users = UserRepository(db)
        self.periods = PeriodRepository(db)
        self.organizations = OrganizationRepository(db)
        self.inventory = InventoryService(db)

    def _q(self, value) -> Decimal:
        return Decimal(value or 0).quantize(PRECISION, rounding=ROUND_HALF_UP)

    def _organization_currency(self, organization_id):
        organization = self.organizations.get(organization_id)
        if not organization:
            raise not_found("Organization not found")
        return organization.base_currency

    def _require_open_period(self, organization_id, entry_date):
        period = self.periods.resolve_by_date(organization_id, entry_date)
        if not period:
            raise forbidden("No financial period for project transaction date")
        JournalValidationService.validate_period_open(period)
        return period

    def _validate_project_relations(self, organization_id, payload, current=None):
        customer_id = payload.get("customer_id", current.customer_id if current else None)
        owner_user_id = payload.get("owner_user_id", current.owner_user_id if current else None)
        if customer_id:
            customer = self.customers.get(organization_id, customer_id)
            if not customer:
                raise forbidden("Customer must belong to the same organization")
        if owner_user_id:
            if not self.users.get_by_id(owner_user_id):
                raise forbidden("Project owner user not found")
            membership = self.memberships.get_membership(owner_user_id, organization_id)
            if not membership or membership.deleted_at is not None:
                raise forbidden("Project owner must belong to the same organization")

    def _validate_project_payload(self, organization_id, payload, current=None):
        merged = {
            "code": current.code if current else None,
            "name": current.name if current else None,
            "status": current.status if current else ProjectStatus.DRAFT,
            "start_date": current.start_date if current else None,
            "end_date": current.end_date if current else None,
            "budget_revenue": current.budget_revenue if current else None,
            "budget_cost": current.budget_cost if current else None,
            "budget_hours": current.budget_hours if current else None,
            "currency_code": current.currency_code if current else None,
            "customer_id": current.customer_id if current else None,
            "owner_user_id": current.owner_user_id if current else None,
        }
        merged.update(payload)
        if not merged.get("name"):
            raise forbidden("Project name is required")
        if merged.get("code"):
            existing = self.projects.get_by_code(organization_id, merged["code"])
            if existing and (not current or existing.id != current.id):
                raise forbidden("Project code must be unique within the organization")
        start_date = merged.get("start_date")
        end_date = merged.get("end_date")
        if start_date and end_date and start_date > end_date:
            raise forbidden("Project start date cannot be after end date")
        for field_name in ["budget_revenue", "budget_cost", "budget_hours"]:
            value = merged.get(field_name)
            if value is not None and self._q(value) < ZERO:
                raise forbidden(f"{field_name} must be non-negative")
        self._validate_project_relations(organization_id, merged, current=current)
        return merged

    def _record_status_history(self, organization_id, project, from_status, to_status, actor_user_id, notes=None):
        self.projects.create_status_history(
            organization_id=organization_id,
            project_id=project.id,
            from_status=from_status,
            to_status=to_status,
            changed_at=datetime.now(UTC),
            changed_by_user_id=actor_user_id,
            notes=notes,
        )

    def create_project(self, organization_id, actor_user_id, payload):
        normalized = self._validate_project_payload(organization_id, payload)
        project = self.projects.create_project(
            organization_id=organization_id,
            code=normalized.get("code"),
            name=normalized["name"],
            description=normalized.get("description"),
            customer_id=normalized.get("customer_id"),
            owner_user_id=normalized.get("owner_user_id"),
            status=normalized.get("status") or ProjectStatus.DRAFT,
            start_date=normalized.get("start_date"),
            end_date=normalized.get("end_date"),
            budget_revenue=normalized.get("budget_revenue"),
            budget_cost=normalized.get("budget_cost"),
            budget_hours=normalized.get("budget_hours"),
            currency_code=normalized.get("currency_code") or self._organization_currency(organization_id),
            is_active=True,
        )
        self._record_status_history(organization_id, project, None, project.status, actor_user_id, notes="Project created")
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="project.created", entity_type="project", entity_id=str(project.id))
        self.db.commit()
        return project

    def get_project(self, organization_id, project_id):
        project = self.projects.get_project(organization_id, project_id)
        if not project:
            raise not_found("Project not found")
        return project

    def list_projects(self, organization_id, search=None, status=None, customer_id=None, active_only=None):
        return self.projects.list_projects(organization_id, search=search, status=status, customer_id=customer_id, active_only=active_only)

    def update_project(self, organization_id, project_id, actor_user_id, payload):
        project = self.get_project(organization_id, project_id)
        normalized = self._validate_project_payload(organization_id, payload, current=project)
        old_status = project.status
        new_status = normalized.get("status", project.status)
        if new_status != old_status:
            self._validate_status_transition(project, new_status)
        for key, value in normalized.items():
            setattr(project, key, value)
        if payload.get("is_active") is not None:
            project.is_active = payload["is_active"]
        if new_status != old_status:
            self._record_status_history(organization_id, project, old_status, new_status, actor_user_id, notes="Status changed")
            self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="project.status_changed", entity_type="project", entity_id=str(project.id), metadata_json={"from_status": old_status, "to_status": new_status})
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="project.updated", entity_type="project", entity_id=str(project.id))
        self.db.commit()
        return project

    def _validate_status_transition(self, project, new_status: ProjectStatus):
        allowed = ALLOWED_STATUS_TRANSITIONS.get(project.status, {project.status})
        if new_status not in allowed:
            raise forbidden("Invalid project status transition")

    def archive_project(self, organization_id, project_id, actor_user_id):
        project = self.get_project(organization_id, project_id)
        project.is_active = False
        project.archived_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="project.archived", entity_type="project", entity_id=str(project.id))
        self.db.commit()

    def budget(self, organization_id, project_id):
        project = self.get_project(organization_id, project_id)
        return {
            "project_id": project.id,
            "budget_revenue": project.budget_revenue,
            "budget_cost": project.budget_cost,
            "budget_hours": project.budget_hours,
            "currency_code": project.currency_code,
        }

    def update_budget(self, organization_id, project_id, actor_user_id, payload):
        project = self.get_project(organization_id, project_id)
        normalized = self._validate_project_payload(organization_id, payload, current=project)
        for key in ["budget_revenue", "budget_cost", "budget_hours", "currency_code"]:
            if key in normalized:
                setattr(project, key, normalized.get(key))
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="project.budget_updated", entity_type="project", entity_id=str(project.id))
        self.db.commit()
        return self.budget(organization_id, project_id)

    def _ensure_project_accepts_new_entries(self, organization_id, project_id):
        project = self.get_project(organization_id, project_id)
        if not project.is_active or project.archived_at is not None or project.status in {ProjectStatus.CANCELLED, ProjectStatus.COMPLETED}:
            raise forbidden("Archived or closed projects cannot receive new entries")
        return project

    def validate_project_attribution(self, organization_id, project_id, *, customer_id=None, allow_inactive=False):
        project = self.get_project(organization_id, project_id)
        if not allow_inactive and (not project.is_active or project.archived_at is not None):
            raise forbidden("Archived or inactive projects cannot be linked to new document lines")
        if customer_id and project.customer_id and project.customer_id != customer_id:
            raise forbidden("Project customer must match the invoice customer")
        return project

    def record_cost_entry(self, organization_id, actor_user_id, *, project_id, source_entity_type, source_entity_id, source_line_id=None, transaction_date, description, amount, currency_code, account_id=None, supplier_id=None, commit=False):
        project = self._ensure_project_accepts_new_entries(organization_id, project_id)
        self._require_open_period(organization_id, transaction_date)
        amount = self._q(amount)
        if amount == ZERO:
            raise forbidden("Project cost entry amount cannot be zero")
        entry = self.projects.create_cost_entry(
            organization_id=organization_id,
            project_id=project.id,
            source_entity_type=source_entity_type,
            source_entity_id=str(source_entity_id),
            source_line_id=str(source_line_id) if source_line_id else None,
            transaction_date=transaction_date,
            description=description,
            amount=amount,
            currency_code=currency_code,
            account_id=account_id,
            supplier_id=supplier_id,
            created_by_user_id=actor_user_id,
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="project.cost_recorded", entity_type="project_cost_entry", entity_id=str(entry.id), metadata_json={"project_id": str(project.id)})
        if commit:
            self.db.commit()
        return entry

    def record_revenue_entry(self, organization_id, actor_user_id, *, project_id, source_entity_type, source_entity_id, source_line_id=None, transaction_date, description, amount, currency_code, account_id=None, customer_id=None, commit=False):
        project = self._ensure_project_accepts_new_entries(organization_id, project_id)
        if customer_id and project.customer_id and project.customer_id != customer_id:
            raise forbidden("Project customer must match the attributed revenue customer")
        self._require_open_period(organization_id, transaction_date)
        amount = self._q(amount)
        if amount == ZERO:
            raise forbidden("Project revenue entry amount cannot be zero")
        entry = self.projects.create_revenue_entry(
            organization_id=organization_id,
            project_id=project.id,
            source_entity_type=source_entity_type,
            source_entity_id=str(source_entity_id),
            source_line_id=str(source_line_id) if source_line_id else None,
            transaction_date=transaction_date,
            description=description,
            amount=amount,
            currency_code=currency_code,
            account_id=account_id,
            customer_id=customer_id,
            created_by_user_id=actor_user_id,
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="project.revenue_recorded", entity_type="project_revenue_entry", entity_id=str(entry.id), metadata_json={"project_id": str(project.id)})
        if commit:
            self.db.commit()
        return entry

    def record_bill_costs(self, organization_id, bill, lines, actor_user_id):
        created = []
        for line in lines:
            if not getattr(line, "project_id", None):
                continue
            linked_item = self.inventory._resolve_line_item(organization_id, line)
            if linked_item and linked_item.is_tracked_inventory:
                continue
            created.append(
                self.record_cost_entry(
                    organization_id,
                    actor_user_id,
                    project_id=line.project_id,
                    source_entity_type="bill",
                    source_entity_id=bill.id,
                    source_line_id=line.id,
                    transaction_date=bill.issue_date,
                    description=line.description,
                    amount=line.line_taxable_amount or line.line_subtotal,
                    currency_code=bill.currency_code,
                    account_id=line.account_id,
                    supplier_id=bill.supplier_id,
                )
            )
        return created

    def record_invoice_entries(self, organization_id, invoice, lines, inventory_hooks, actor_user_id):
        created_revenue = []
        created_cost = []
        cost_hook_by_line_id = {str(hook["line"].id): hook for hook in inventory_hooks}
        for line in lines:
            if not getattr(line, "project_id", None):
                continue
            created_revenue.append(
                self.record_revenue_entry(
                    organization_id,
                    actor_user_id,
                    project_id=line.project_id,
                    source_entity_type="invoice",
                    source_entity_id=invoice.id,
                    source_line_id=line.id,
                    transaction_date=invoice.issue_date,
                    description=line.description,
                    amount=line.line_taxable_amount or line.line_subtotal,
                    currency_code=invoice.currency_code,
                    account_id=line.account_id,
                    customer_id=invoice.customer_id,
                )
            )
            hook = cost_hook_by_line_id.get(str(line.id))
            if hook and abs(hook["movement"].total_cost) > 0:
                created_cost.append(
                    self.record_cost_entry(
                        organization_id,
                        actor_user_id,
                        project_id=line.project_id,
                        source_entity_type="invoice",
                        source_entity_id=invoice.id,
                        source_line_id=line.id,
                        transaction_date=invoice.issue_date,
                        description=f"COGS {line.description}",
                        amount=abs(hook["movement"].total_cost),
                        currency_code=invoice.currency_code,
                        account_id=hook["item"].expense_account_id,
                    )
                )
        return created_cost, created_revenue

    def reverse_source_entries(self, organization_id, source_entity_type, source_entity_id, actor_user_id, reversal_date):
        reversed_costs = []
        reversed_revenue = []
        for entry in [e for e in self.projects.list_cost_entries(organization_id, source_entity_type=source_entity_type, source_entity_id=source_entity_id) if e.reversal_of_entry_id is None]:
            reversed_costs.append(
                self.projects.create_cost_entry(
                    organization_id=organization_id,
                    project_id=entry.project_id,
                    source_entity_type=entry.source_entity_type,
                    source_entity_id=entry.source_entity_id,
                    source_line_id=entry.source_line_id,
                    transaction_date=reversal_date,
                    description=f"REVERSAL {entry.description}",
                    amount=-self._q(entry.amount),
                    currency_code=entry.currency_code,
                    account_id=entry.account_id,
                    supplier_id=entry.supplier_id,
                    created_by_user_id=actor_user_id,
                    reversal_of_entry_id=entry.id,
                )
            )
        for entry in [e for e in self.projects.list_revenue_entries(organization_id, source_entity_type=source_entity_type, source_entity_id=source_entity_id) if e.reversal_of_entry_id is None]:
            reversed_revenue.append(
                self.projects.create_revenue_entry(
                    organization_id=organization_id,
                    project_id=entry.project_id,
                    source_entity_type=entry.source_entity_type,
                    source_entity_id=entry.source_entity_id,
                    source_line_id=entry.source_line_id,
                    transaction_date=reversal_date,
                    description=f"REVERSAL {entry.description}",
                    amount=-self._q(entry.amount),
                    currency_code=entry.currency_code,
                    account_id=entry.account_id,
                    customer_id=entry.customer_id,
                    created_by_user_id=actor_user_id,
                    reversal_of_entry_id=entry.id,
                )
            )
        for entry in reversed_costs:
            self.audit.create(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                action="project.cost_reversed",
                entity_type="project_cost_entry",
                entity_id=str(entry.id),
                metadata_json={"source_entity_type": source_entity_type, "source_entity_id": str(source_entity_id)},
            )
        for entry in reversed_revenue:
            self.audit.create(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                action="project.revenue_reversed",
                entity_type="project_revenue_entry",
                entity_id=str(entry.id),
                metadata_json={"source_entity_type": source_entity_type, "source_entity_id": str(source_entity_id)},
            )
        return reversed_costs, reversed_revenue

    def create_time_entry(self, organization_id, project_id, actor_user_id, payload):
        project = self._ensure_project_accepts_new_entries(organization_id, project_id)
        if payload["hours"] <= 0:
            raise forbidden("Time entry hours must be greater than zero")
        self._require_open_period(organization_id, payload["entry_date"])
        membership = self.memberships.get_membership(payload["user_id"], organization_id)
        if not membership:
            raise forbidden("Time entry user must belong to the same organization")
        entry = self.projects.create_time_entry(
            organization_id=organization_id,
            project_id=project.id,
            user_id=payload["user_id"],
            entry_date=payload["entry_date"],
            hours=payload["hours"],
            description=payload.get("description"),
            is_billable=payload.get("is_billable", True),
            cost_rate=payload.get("cost_rate"),
            billing_rate=payload.get("billing_rate"),
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="project.time_entry_created", entity_type="project_time_entry", entity_id=str(entry.id), metadata_json={"project_id": str(project.id)})
        self.db.commit()
        return entry

    def update_time_entry(self, organization_id, project_id, time_entry_id, actor_user_id, payload):
        entry = self.projects.get_time_entry(organization_id, project_id, time_entry_id)
        if not entry:
            raise not_found("Project time entry not found")
        if payload.get("entry_date"):
            self._require_open_period(organization_id, payload["entry_date"])
        if payload.get("hours") is not None and payload["hours"] <= 0:
            raise forbidden("Time entry hours must be greater than zero")
        for key, value in payload.items():
            setattr(entry, key, value)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="project.time_entry_updated", entity_type="project_time_entry", entity_id=str(entry.id))
        self.db.commit()
        return entry

    def delete_time_entry(self, organization_id, project_id, time_entry_id, actor_user_id):
        entry = self.projects.get_time_entry(organization_id, project_id, time_entry_id)
        if not entry:
            raise not_found("Project time entry not found")
        entry.deleted_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="project.time_entry_deleted", entity_type="project_time_entry", entity_id=str(entry.id))
        self.db.commit()

    def list_time_entries(self, organization_id, project_id):
        self.get_project(organization_id, project_id)
        return self.projects.list_time_entries(organization_id, project_id)

    def list_costs(self, organization_id, project_id):
        self.get_project(organization_id, project_id)
        return self.projects.list_cost_entries(organization_id, project_id=project_id)

    def list_revenue(self, organization_id, project_id):
        self.get_project(organization_id, project_id)
        return self.projects.list_revenue_entries(organization_id, project_id=project_id)

    def profitability(self, organization_id, project_id):
        project = self.get_project(organization_id, project_id)
        cost_entries = self.projects.list_cost_entries(organization_id, project_id=project_id)
        revenue_entries = self.projects.list_revenue_entries(organization_id, project_id=project_id)
        time_entries = self.projects.list_time_entries(organization_id, project_id)
        cost_total = sum((self._q(entry.amount) for entry in cost_entries), ZERO)
        revenue_total = sum((self._q(entry.amount) for entry in revenue_entries), ZERO)
        time_cost_total = sum((self._q(entry.hours) * self._q(entry.cost_rate) for entry in time_entries), ZERO)
        actual_hours = sum((self._q(entry.hours) for entry in time_entries), ZERO)
        total_cost_with_time = cost_total + time_cost_total
        return {
            "project_id": project.id,
            "project_name": project.name,
            "status": project.status,
            "currency_code": project.currency_code,
            "revenue_total": self._q(revenue_total),
            "cost_total": self._q(total_cost_with_time),
            "time_cost_total": self._q(time_cost_total),
            "gross_margin": self._q(revenue_total - total_cost_with_time),
            "budget_revenue": project.budget_revenue,
            "budget_cost": project.budget_cost,
            "budget_hours": project.budget_hours,
            "actual_hours": self._q(actual_hours),
            "revenue_variance": self._q(revenue_total - self._q(project.budget_revenue)) if project.budget_revenue is not None else None,
            "cost_variance": self._q(self._q(project.budget_cost) - total_cost_with_time) if project.budget_cost is not None else None,
        }

    def activity(self, organization_id, project_id):
        self.get_project(organization_id, project_id)
        items = []
        for entry in self.projects.list_cost_entries(organization_id, project_id=project_id):
            items.append({"activity_type": "cost", "transaction_date": entry.transaction_date, "description": entry.description, "amount": entry.amount, "source_entity_type": entry.source_entity_type, "source_entity_id": entry.source_entity_id})
        for entry in self.projects.list_revenue_entries(organization_id, project_id=project_id):
            items.append({"activity_type": "revenue", "transaction_date": entry.transaction_date, "description": entry.description, "amount": entry.amount, "source_entity_type": entry.source_entity_type, "source_entity_id": entry.source_entity_id})
        for entry in self.projects.list_time_entries(organization_id, project_id):
            items.append({"activity_type": "time", "transaction_date": entry.entry_date, "description": entry.description or "Time entry", "hours": entry.hours, "source_entity_type": "time_entry", "source_entity_id": str(entry.id)})
        for entry in self.projects.list_status_history(organization_id, project_id):
            items.append({"activity_type": "status", "transaction_date": entry.changed_at.date(), "description": f"Status changed to {entry.to_status}", "source_entity_type": "project_status", "source_entity_id": str(entry.id)})
        items.sort(key=lambda item: (item["transaction_date"], item["activity_type"]))
        return {"project_id": project_id, "items": items}

    def project_summary(self, organization_id, customer_id=None):
        projects = self.projects.list_projects(organization_id, customer_id=customer_id)
        return [self.profitability(organization_id, project.id) for project in projects]

    def project_profitability_report(self, organization_id):
        return self.project_summary(organization_id)

    def budget_vs_actual_report(self, organization_id):
        return self.project_summary(organization_id)
