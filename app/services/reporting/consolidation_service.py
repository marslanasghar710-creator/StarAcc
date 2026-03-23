from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import json
from typing import Iterable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import AccountType, JournalStatus, MembershipStatus, ReportRunStatus
from app.core.exceptions import forbidden, not_found
from app.db.models import Account, FinancialPeriod, JournalEntry, JournalLine, Organization, OrganizationUser
from app.repositories.consolidation_repository import ConsolidationRepository
from app.repositories.membership import MembershipRepository
from app.repositories.rbac import RBACRepository
from app.repositories.report_repository import ReportRepository
from app.schemas.consolidation import (
    ConsolidatedBalanceSheetResponse,
    ConsolidatedEntityBreakdown,
    ConsolidatedIncomeStatementResponse,
    ConsolidatedSectionResponse,
    ConsolidatedStatementLine,
    ConsolidatedTrialBalanceLine,
    ConsolidatedTrialBalanceResponse,
    ConsolidationGroupCreate,
    ConsolidationGroupResponse,
    ConsolidationGroupUpdate,
    ConsolidationReportMetadata,
    ConsolidationRunCreate,
    ConsolidationRunResponse,
    EliminationEntryCreate,
    EliminationEntryResponse,
    EliminationLineResponse,
    GroupEntityCreate,
    GroupEntityDetailResponse,
)
from app.services.reporting.common import natural_amount

UTC = timezone.utc
ZERO = Decimal("0")


@dataclass(slots=True)
class AccessibleGroup:
    group: object
    membership: OrganizationUser


class ConsolidationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ConsolidationRepository(db)
        self.memberships = MembershipRepository(db)
        self.rbac = RBACRepository(db)
        self.reports = ReportRepository(db)

    def _assert_org_permission(self, organization_id: str | UUID, user_id: str | UUID, permission_code: str) -> OrganizationUser:
        membership = self.memberships.get_membership(user_id, organization_id)
        if not membership or membership.status != MembershipStatus.ACTIVE:
            raise forbidden("Not a member of this organization")
        if not self.rbac.role_has_permission(membership.role_id, permission_code):
            raise forbidden("Permission denied")
        return membership

    def _assert_group_permission(self, group_id: str | UUID, user_id: str | UUID, permission_code: str) -> AccessibleGroup:
        group = self.repo.get_group_any_org(group_id)
        if not group:
            raise not_found("Consolidation group not found")
        membership = self._assert_org_permission(group.organization_id, user_id, permission_code)
        return AccessibleGroup(group=group, membership=membership)

    def _accessible_org_ids_for_user(self, user_id: str | UUID) -> set[UUID]:
        return {membership.organization_id for membership in self.memberships.list_for_user(user_id) if membership.status == MembershipStatus.ACTIVE}

    def create_group(self, organization_id: str, actor_user_id: str, payload: ConsolidationGroupCreate) -> ConsolidationGroupResponse:
        membership = self._assert_org_permission(organization_id, actor_user_id, "consolidation.manage")
        group = self.repo.create_group(
            organization_id=organization_id,
            name=payload.name.strip(),
            reporting_currency=payload.reporting_currency.upper(),
            description=payload.description,
            created_by_user_id=membership.user_id,
        )
        self.db.commit()
        self.db.refresh(group)
        return ConsolidationGroupResponse.model_validate(group)

    def list_groups(self, organization_id: str, actor_user_id: str, *, limit: int = 50, offset: int = 0):
        self._assert_org_permission(organization_id, actor_user_id, "consolidation.read")
        items = [ConsolidationGroupResponse.model_validate(group) for group in self.repo.list_groups(organization_id, limit=limit, offset=offset)]
        total = self.repo.count_groups(organization_id)
        return items, total

    def get_group(self, organization_id: str, group_id: str, actor_user_id: str) -> ConsolidationGroupResponse:
        self._assert_org_permission(organization_id, actor_user_id, "consolidation.read")
        group = self.repo.get_group(organization_id, group_id)
        if not group:
            raise not_found("Consolidation group not found")
        return ConsolidationGroupResponse.model_validate(group)

    def update_group(self, organization_id: str, group_id: str, actor_user_id: str, payload: ConsolidationGroupUpdate) -> ConsolidationGroupResponse:
        self._assert_org_permission(organization_id, actor_user_id, "consolidation.manage")
        group = self.repo.get_group(organization_id, group_id)
        if not group:
            raise not_found("Consolidation group not found")
        for field, value in payload.model_dump(exclude_unset=True).items():
            if field == "reporting_currency" and value is not None:
                value = value.upper()
            setattr(group, field, value)
        self.db.commit()
        self.db.refresh(group)
        return ConsolidationGroupResponse.model_validate(group)

    def add_group_entity(self, group_id: str, actor_user_id: str, payload: GroupEntityCreate) -> GroupEntityDetailResponse:
        access = self._assert_group_permission(group_id, actor_user_id, "consolidation.manage")
        accessible_org_ids = self._accessible_org_ids_for_user(actor_user_id)
        if payload.organization_id not in accessible_org_ids:
            raise forbidden("You do not have access to the selected entity organization")
        if self.repo.get_group_entity(group_id, payload.organization_id):
            raise forbidden("Entity is already in this group")
        organization = self.repo.get_organization(payload.organization_id)
        if not organization:
            raise not_found("Organization not found")
        entity = self.repo.create_group_entity(
            group_id=group_id,
            organization_id=payload.organization_id,
            ownership_percentage=payload.ownership_percentage,
            is_primary=payload.is_primary,
        )
        self.db.commit()
        return GroupEntityDetailResponse(
            id=entity.id,
            group_id=entity.group_id,
            organization_id=entity.organization_id,
            organization_name=organization.name,
            organization_currency=organization.base_currency,
            ownership_percentage=entity.ownership_percentage,
            is_primary=entity.is_primary,
            created_at=entity.created_at,
        )

    def list_group_entities(self, group_id: str, actor_user_id: str) -> list[GroupEntityDetailResponse]:
        self._assert_group_permission(group_id, actor_user_id, "consolidation.read")
        results: list[GroupEntityDetailResponse] = []
        for entity in self.repo.list_group_entities(group_id):
            organization = self.repo.get_organization(entity.organization_id)
            if organization is None:
                continue
            results.append(
                GroupEntityDetailResponse(
                    id=entity.id,
                    group_id=entity.group_id,
                    organization_id=entity.organization_id,
                    organization_name=organization.name,
                    organization_currency=organization.base_currency,
                    ownership_percentage=entity.ownership_percentage,
                    is_primary=entity.is_primary,
                    created_at=entity.created_at,
                )
            )
        return results

    def remove_group_entity(self, group_id: str, entity_id: str, actor_user_id: str) -> None:
        self._assert_group_permission(group_id, actor_user_id, "consolidation.manage")
        entity = self.repo.get_group_entity_by_id(group_id, entity_id)
        if not entity:
            raise not_found("Group entity not found")
        entity.deleted_at = datetime.now(UTC)
        self.db.commit()

    def create_elimination_entry(self, group_id: str, actor_user_id: str, payload: EliminationEntryCreate) -> EliminationEntryResponse:
        access = self._assert_group_permission(group_id, actor_user_id, "consolidation.eliminate")
        self._validate_selected_entities(group_id, actor_user_id, payload.source_entities or None)
        entry = self.repo.create_elimination_entry(
            group_id=group_id,
            consolidation_run_id=payload.consolidation_run_id,
            description=payload.description,
            period_start=payload.period_start,
            period_end=payload.period_end,
            source_entities_json=[str(item) for item in payload.source_entities],
            journal_lines_json=[line.model_dump(mode="json") for line in payload.journal_lines],
            is_manual=True,
            created_by_user_id=access.membership.user_id,
            metadata_json={"entry_origin": "manual"},
        )
        self.db.commit()
        return self._map_elimination(entry)

    def list_eliminations(self, group_id: str, actor_user_id: str, *, limit: int = 50, offset: int = 0):
        self._assert_group_permission(group_id, actor_user_id, "consolidation.read")
        items = [self._map_elimination(entry) for entry in self.repo.list_elimination_entries(group_id, limit=limit, offset=offset)]
        total = self.repo.count_elimination_entries(group_id)
        return items, total

    def get_elimination(self, group_id: str, elimination_id: str, actor_user_id: str) -> EliminationEntryResponse:
        self._assert_group_permission(group_id, actor_user_id, "consolidation.read")
        entry = self.repo.get_elimination_entry(group_id, elimination_id)
        if not entry:
            raise not_found("Elimination entry not found")
        return self._map_elimination(entry)

    def list_runs(self, group_id: str, actor_user_id: str, *, limit: int = 50, offset: int = 0):
        self._assert_group_permission(group_id, actor_user_id, "consolidation.read")
        items = [self._map_run(run) for run in self.repo.list_runs(group_id, limit=limit, offset=offset)]
        total = self.repo.count_runs(group_id)
        return items, total

    def get_run(self, group_id: str, run_id: str, actor_user_id: str) -> ConsolidationRunResponse:
        self._assert_group_permission(group_id, actor_user_id, "consolidation.read")
        run = self.repo.get_run(group_id, run_id)
        if not run:
            raise not_found("Consolidation run not found")
        return self._map_run(run)

    def run_consolidation(self, group_id: str, actor_user_id: str, payload: ConsolidationRunCreate) -> ConsolidationRunResponse:
        access = self._assert_group_permission(group_id, actor_user_id, "consolidation.run")
        selected_entities = self._validate_selected_entities(group_id, actor_user_id, payload.entity_ids)
        fx_rates = self._resolve_fx_rates(access.group.reporting_currency, selected_entities, payload.fx_rates)
        request_fingerprint = self._build_run_fingerprint(access.group.id, payload.period_start, payload.period_end, selected_entities, fx_rates)
        existing_run = self.repo.find_run_by_fingerprint(access.group.id, request_fingerprint)
        if existing_run and existing_run.created_at and existing_run.created_at >= datetime.now(UTC) - timedelta(minutes=15):
            return self._map_run(existing_run)
        run = self.repo.create_run(
            group_id=access.group.id,
            period_start=payload.period_start,
            period_end=payload.period_end,
            status=ReportRunStatus.PENDING,
            created_by_user_id=access.membership.user_id,
            selected_entity_ids_json=[str(item.id) for item in selected_entities],
            fx_rates_json={str(key): str(value) for key, value in fx_rates.items()},
            request_fingerprint=request_fingerprint,
        )
        snapshots, elimination_entries = self._build_consolidation_snapshots(
            access.group,
            selected_entities,
            payload.period_start,
            payload.period_end,
            fx_rates,
            run_id=run.id,
            actor_user_id=actor_user_id,
            persist_auto_entries=True,
        )
        run.status = ReportRunStatus.COMPLETED
        run.completed_at = datetime.now(UTC)
        run.report_snapshot_json = snapshots
        run.elimination_summary_json = {
            "count": len(elimination_entries),
            "manual_count": sum(1 for item in elimination_entries if item.is_manual),
            "auto_count": sum(1 for item in elimination_entries if not item.is_manual),
        }
        self.db.commit()
        self.db.refresh(run)
        return self._map_run(run)

    def get_balance_sheet(self, group_id: str, actor_user_id: str, *, run_id: str | None = None, period_start=None, period_end=None):
        return self._get_report(group_id, actor_user_id, "balance_sheet", run_id=run_id, period_start=period_start, period_end=period_end)

    def get_income_statement(self, group_id: str, actor_user_id: str, *, run_id: str | None = None, period_start=None, period_end=None):
        return self._get_report(group_id, actor_user_id, "income_statement", run_id=run_id, period_start=period_start, period_end=period_end)

    def get_trial_balance(self, group_id: str, actor_user_id: str, *, run_id: str | None = None, period_start=None, period_end=None):
        return self._get_report(group_id, actor_user_id, "trial_balance", run_id=run_id, period_start=period_start, period_end=period_end)

    def _get_report(self, group_id: str, actor_user_id: str, report_key: str, *, run_id: str | None, period_start, period_end):
        access = self._assert_group_permission(group_id, actor_user_id, "consolidation.read")
        if run_id:
            run = self.repo.get_run(group_id, run_id)
            if not run:
                raise not_found("Consolidation run not found")
            return self._report_from_snapshot(report_key, run.report_snapshot_json)
        if not period_start or not period_end:
            raise forbidden("period_start and period_end are required when run_id is not supplied")
        selected_entities = self._validate_selected_entities(group_id, actor_user_id, None)
        fx_rates = self._resolve_fx_rates(access.group.reporting_currency, selected_entities, [])
        snapshots, _ = self._build_consolidation_snapshots(
            access.group,
            selected_entities,
            period_start,
            period_end,
            fx_rates,
            run_id=None,
            actor_user_id=actor_user_id,
            persist_auto_entries=False,
        )
        return self._report_from_snapshot(report_key, snapshots)

    def _report_from_snapshot(self, report_key: str, snapshot: dict | None):
        if not snapshot or report_key not in snapshot:
            raise not_found("Report snapshot not found")
        if report_key == "balance_sheet":
            return ConsolidatedBalanceSheetResponse.model_validate(snapshot[report_key])
        if report_key == "income_statement":
            return ConsolidatedIncomeStatementResponse.model_validate(snapshot[report_key])
        return ConsolidatedTrialBalanceResponse.model_validate(snapshot[report_key])

    def _validate_selected_entities(self, group_id: str, actor_user_id: str, entity_ids: Iterable[UUID] | None) -> list[Organization]:
        group_entities = self.repo.list_group_entities(group_id)
        if not group_entities:
            raise forbidden("Add at least one entity to the consolidation group before running consolidation")
        accessible_org_ids = self._accessible_org_ids_for_user(actor_user_id)
        organizations = []
        requested = set(entity_ids or [])
        if requested and len(requested) != len(list(entity_ids or [])):
            raise forbidden("Duplicate entities are not allowed")
        for entity in group_entities:
            if entity.organization_id not in accessible_org_ids:
                continue
            if requested and entity.organization_id not in requested:
                continue
            org = self.repo.get_organization(entity.organization_id)
            if org:
                organizations.append(org)
        if requested and len(organizations) != len(requested):
            raise forbidden("One or more selected entities are not in the consolidation group or are outside your scope")
        if not organizations:
            raise forbidden("No accessible entities are available for consolidation")
        seen = set()
        for organization in organizations:
            if organization.id in seen:
                raise forbidden("Duplicate entities are not allowed")
            seen.add(organization.id)
        return organizations

    def _resolve_fx_rates(self, reporting_currency: str, organizations: list[Organization], provided_rates) -> dict[UUID, Decimal]:
        rate_map = {item.organization_id: Decimal(item.rate) for item in provided_rates}
        resolved: dict[UUID, Decimal] = {}
        for organization in organizations:
            if organization.base_currency == reporting_currency:
                resolved[organization.id] = Decimal("1")
                continue
            if organization.id not in rate_map:
                raise forbidden(f"FX rate is required for organization {organization.name} ({organization.base_currency} -> {reporting_currency})")
            resolved[organization.id] = rate_map[organization.id]
        return resolved

    def _validate_period_open(self, organization_id: UUID, period_start, period_end):
        period = self.db.scalar(
            select(FinancialPeriod).where(
                FinancialPeriod.organization_id == organization_id,
                FinancialPeriod.start_date <= period_start,
                FinancialPeriod.end_date >= period_end,
                FinancialPeriod.deleted_at.is_(None),
            )
        )
        if not period or period.status != "open":
            raise forbidden("Cannot run consolidation on invalid or closed financial periods")

    def _build_consolidation_snapshots(self, group, organizations: list[Organization], period_start, period_end, fx_rates, *, run_id, actor_user_id, persist_auto_entries: bool):
        for organization in organizations:
            self._validate_period_open(organization.id, period_start, period_end)

        manual_entries = self.repo.list_elimination_entries(group.id, period_start=period_start, period_end=period_end)
        auto_entries = self._generate_auto_eliminations(group.id, organizations, period_start, period_end, fx_rates, run_id=run_id, actor_user_id=actor_user_id, persist=persist_auto_entries)
        elimination_entries = [*manual_entries, *auto_entries]

        combined = defaultdict(lambda: {
            "account_code": "",
            "account_name": "",
            "account_type": None,
            "debit_total": ZERO,
            "credit_total": ZERO,
            "entity_breakdown": defaultdict(lambda: {"organization_name": "", "amount": ZERO}),
        })

        entity_ids = [organization.id for organization in organizations]
        for organization in organizations:
            rate = fx_rates[organization.id]
            activity_rows = self.reports.aggregate_account_activity(
                organization.id,
                as_of_date=period_end,
            )
            for row in activity_rows:
                key = (row["code"], row["name"], row["account_type"].value)
                bucket = combined[key]
                bucket["account_code"] = row["code"]
                bucket["account_name"] = row["name"]
                bucket["account_type"] = row["account_type"]
                debit_total = Decimal(row["debit_total"]) * rate
                credit_total = Decimal(row["credit_total"]) * rate
                bucket["debit_total"] += debit_total
                bucket["credit_total"] += credit_total
                natural = natural_amount(row["account_type"], debit_total, credit_total)
                bucket["entity_breakdown"][organization.id]["organization_name"] = organization.name
                bucket["entity_breakdown"][organization.id]["amount"] += natural

        for elimination in elimination_entries:
            for line in elimination.journal_lines_json:
                account_type = AccountType(line["account_type"])
                key = (line["account_code"], line["account_name"], account_type.value)
                bucket = combined[key]
                bucket["account_code"] = line["account_code"]
                bucket["account_name"] = line["account_name"]
                bucket["account_type"] = account_type
                debit_amount = Decimal(str(line.get("debit_amount", "0")))
                credit_amount = Decimal(str(line.get("credit_amount", "0")))
                bucket["debit_total"] += debit_amount
                bucket["credit_total"] += credit_amount
                source_org = line.get("source_organization_id")
                if source_org:
                    org_uuid = UUID(source_org)
                    bucket["entity_breakdown"][org_uuid]["organization_name"] = line.get("source_organization_name") or bucket["entity_breakdown"][org_uuid]["organization_name"]
                    bucket["entity_breakdown"][org_uuid]["amount"] += natural_amount(account_type, debit_amount, credit_amount)

        generated_at = datetime.now(UTC)
        metadata = ConsolidationReportMetadata(
            group_id=group.id,
            group_name=group.name,
            reporting_currency=group.reporting_currency,
            period_start=period_start,
            period_end=period_end,
            run_id=run_id,
            generated_at=generated_at,
            elimination_count=len(elimination_entries),
            entity_ids=entity_ids,
        )
        balance_sheet = self._build_balance_sheet(metadata, combined, period_start, period_end)
        income_statement = self._build_income_statement(metadata, combined, period_start, period_end)
        trial_balance = self._build_trial_balance(metadata, combined)
        return {
            "balance_sheet": balance_sheet.model_dump(mode="json"),
            "income_statement": income_statement.model_dump(mode="json"),
            "trial_balance": trial_balance.model_dump(mode="json"),
        }, elimination_entries

    def _build_balance_sheet(self, metadata, combined, period_start, period_end):
        assets: list[ConsolidatedStatementLine] = []
        liabilities: list[ConsolidatedStatementLine] = []
        equity: list[ConsolidatedStatementLine] = []
        profit_rows = []
        for bucket in combined.values():
            account_type = bucket["account_type"]
            line = ConsolidatedStatementLine(
                account_code=bucket["account_code"],
                account_name=bucket["account_name"],
                account_type=account_type,
                amount=natural_amount(account_type, bucket["debit_total"], bucket["credit_total"]),
                entity_breakdown=self._entity_breakdown(bucket),
            )
            if account_type == AccountType.ASSET:
                assets.append(line)
            elif account_type == AccountType.LIABILITY:
                liabilities.append(line)
            elif account_type == AccountType.EQUITY:
                equity.append(line)
            elif account_type in {AccountType.REVENUE, AccountType.EXPENSE}:
                profit_rows.append(bucket)
        current_earnings = sum(
            (
                natural_amount(row["account_type"], row["debit_total"], row["credit_total"])
                if row["account_type"] == AccountType.REVENUE
                else -natural_amount(row["account_type"], row["debit_total"], row["credit_total"])
                for row in profit_rows
            ),
            ZERO,
        )
        if current_earnings != ZERO:
            equity.append(
                ConsolidatedStatementLine(
                    account_code="CURRENT_EARNINGS",
                    account_name="Current Earnings",
                    account_type=AccountType.EQUITY,
                    amount=current_earnings,
                    entity_breakdown=[],
                )
            )
        asset_total = sum((item.amount for item in assets), ZERO)
        liability_total = sum((item.amount for item in liabilities), ZERO)
        equity_total = sum((item.amount for item in equity), ZERO)
        return ConsolidatedBalanceSheetResponse(
            metadata=metadata,
            assets=ConsolidatedSectionResponse(title="Assets", lines=sorted(assets, key=lambda item: item.account_code), total=asset_total),
            liabilities=ConsolidatedSectionResponse(title="Liabilities", lines=sorted(liabilities, key=lambda item: item.account_code), total=liability_total),
            equity=ConsolidatedSectionResponse(title="Equity", lines=sorted(equity, key=lambda item: item.account_code), total=equity_total),
            total_assets=asset_total,
            total_liabilities_and_equity=liability_total + equity_total,
            balances=asset_total == liability_total + equity_total,
        )

    def _build_income_statement(self, metadata, combined, period_start, period_end):
        revenue: list[ConsolidatedStatementLine] = []
        expenses: list[ConsolidatedStatementLine] = []
        for bucket in combined.values():
            account_type = bucket["account_type"]
            if account_type not in {AccountType.REVENUE, AccountType.EXPENSE}:
                continue
            line = ConsolidatedStatementLine(
                account_code=bucket["account_code"],
                account_name=bucket["account_name"],
                account_type=account_type,
                amount=natural_amount(account_type, bucket["debit_total"], bucket["credit_total"]),
                entity_breakdown=self._entity_breakdown(bucket),
            )
            if account_type == AccountType.REVENUE:
                revenue.append(line)
            else:
                expenses.append(line)
        revenue_total = sum((item.amount for item in revenue), ZERO)
        expense_total = sum((item.amount for item in expenses), ZERO)
        return ConsolidatedIncomeStatementResponse(
            metadata=metadata,
            revenue=ConsolidatedSectionResponse(title="Revenue", lines=sorted(revenue, key=lambda item: item.account_code), total=revenue_total),
            expenses=ConsolidatedSectionResponse(title="Expenses", lines=sorted(expenses, key=lambda item: item.account_code), total=expense_total),
            net_profit=revenue_total - expense_total,
        )

    def _build_trial_balance(self, metadata, combined):
        lines: list[ConsolidatedTrialBalanceLine] = []
        total_debit = ZERO
        total_credit = ZERO
        for bucket in sorted(combined.values(), key=lambda item: item["account_code"]):
            raw_net = bucket["debit_total"] - bucket["credit_total"]
            debit_balance = raw_net if raw_net > ZERO else ZERO
            credit_balance = -raw_net if raw_net < ZERO else ZERO
            total_debit += debit_balance
            total_credit += credit_balance
            lines.append(
                ConsolidatedTrialBalanceLine(
                    account_code=bucket["account_code"],
                    account_name=bucket["account_name"],
                    account_type=bucket["account_type"],
                    debit_balance=debit_balance,
                    credit_balance=credit_balance,
                    entity_breakdown=self._entity_breakdown(bucket),
                )
            )
        return ConsolidatedTrialBalanceResponse(
            metadata=metadata,
            lines=lines,
            total_debit=total_debit,
            total_credit=total_credit,
            balances=total_debit == total_credit,
        )

    def _entity_breakdown(self, bucket) -> list[ConsolidatedEntityBreakdown]:
        values = []
        for organization_id, amount_data in sorted(bucket["entity_breakdown"].items(), key=lambda item: str(item[0])):
            values.append(
                ConsolidatedEntityBreakdown(
                    organization_id=organization_id,
                    organization_name=amount_data["organization_name"] or str(organization_id),
                    amount=amount_data["amount"],
                )
            )
        return values

    def _generate_auto_eliminations(self, group_id, organizations, period_start, period_end, fx_rates, *, run_id, actor_user_id, persist: bool):
        org_ids = [organization.id for organization in organizations]
        if not org_ids:
            return []
        query = (
            select(Account, JournalEntry, JournalLine, Organization)
            .join(JournalLine, JournalLine.account_id == Account.id)
            .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
            .join(Organization, Organization.id == JournalEntry.organization_id)
            .where(
                JournalEntry.organization_id.in_(org_ids),
                JournalEntry.status == JournalStatus.POSTED,
                JournalEntry.entry_date >= period_start,
                JournalEntry.entry_date <= period_end,
                Account.deleted_at.is_(None),
            )
            .order_by(JournalEntry.reference, JournalEntry.entry_date, JournalEntry.entry_number, JournalLine.line_number)
        )
        grouped: dict[str, list[tuple[Account, JournalEntry, JournalLine, Organization]]] = defaultdict(list)
        for account, journal, line, organization in self.db.execute(query).all():
            pair_key = self._intercompany_pair_key(journal)
            if not pair_key:
                continue
            grouped[pair_key].append((account, journal, line, organization))

        created_entries = []
        for pair_key, rows in grouped.items():
            source_entities = {organization.id for *_rest, organization in rows}
            if len(source_entities) < 2:
                continue
            journal_lines = []
            for account, journal, line, organization in rows:
                rate = fx_rates[organization.id]
                debit_amount = Decimal(line.base_credit_amount) * rate
                credit_amount = Decimal(line.base_debit_amount) * rate
                journal_lines.append(
                    {
                        "account_code": account.code,
                        "account_name": account.name,
                        "account_type": account.account_type.value,
                        "debit_amount": str(debit_amount),
                        "credit_amount": str(credit_amount),
                        "source_organization_id": str(organization.id),
                        "source_organization_name": organization.name,
                    }
                )
            if persist:
                created_entries.append(
                    self.repo.create_elimination_entry(
                        group_id=group_id,
                        consolidation_run_id=run_id,
                        description=f"Auto elimination for intercompany pair {pair_key}",
                        period_start=period_start,
                        period_end=period_end,
                        source_entities_json=[str(item) for item in sorted(source_entities, key=str)],
                        journal_lines_json=journal_lines,
                        is_manual=False,
                        created_by_user_id=actor_user_id,
                        metadata_json={"pair_key": pair_key, "entry_origin": "auto"},
                    )
                )
            else:
                created_entries.append(
                    type(
                        "TransientElimination",
                        (),
                        {
                            "id": None,
                            "group_id": group_id,
                            "consolidation_run_id": run_id,
                            "description": f"Auto elimination for intercompany pair {pair_key}",
                            "period_start": period_start,
                            "period_end": period_end,
                            "source_entities_json": [str(item) for item in sorted(source_entities, key=str)],
                            "journal_lines_json": journal_lines,
                            "is_manual": False,
                            "created_by_user_id": actor_user_id,
                            "created_at": datetime.now(UTC),
                        },
                    )()
                )
        return created_entries

    def _intercompany_pair_key(self, journal: JournalEntry) -> str | None:
        metadata = journal.metadata_json or {}
        if metadata.get("intercompany_pair_key"):
            return str(metadata["intercompany_pair_key"])
        if metadata.get("pair_key") and metadata.get("is_intercompany"):
            return str(metadata["pair_key"])
        for value in [journal.source_type, journal.source_module, journal.reference, journal.description]:
            text = (value or "").lower()
            if "intercompany" in text:
                return journal.reference or journal.source_id or journal.description
        if metadata.get("is_intercompany"):
            return journal.reference or journal.source_id or journal.description or str(journal.id)
        return None

    def _build_run_fingerprint(self, group_id, period_start, period_end, organizations: list[Organization], fx_rates: dict[UUID, Decimal]) -> str:
        payload = {
            "group_id": str(group_id),
            "period_start": str(period_start),
            "period_end": str(period_end),
            "entity_ids": sorted(str(item.id) for item in organizations),
            "fx_rates": {str(key): str(value) for key, value in sorted(fx_rates.items(), key=lambda item: str(item[0]))},
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()

    def _map_elimination(self, entry) -> EliminationEntryResponse:
        return EliminationEntryResponse(
            id=entry.id,
            group_id=entry.group_id,
            consolidation_run_id=entry.consolidation_run_id,
            description=entry.description,
            period_start=entry.period_start,
            period_end=entry.period_end,
            source_entities=[UUID(item) for item in entry.source_entities_json],
            journal_lines=[EliminationLineResponse.model_validate(line) for line in entry.journal_lines_json],
            is_manual=entry.is_manual,
            created_by_user_id=entry.created_by_user_id,
            created_at=entry.created_at,
        )

    def _map_run(self, run) -> ConsolidationRunResponse:
        snapshot = run.report_snapshot_json or {}
        return ConsolidationRunResponse(
            id=run.id,
            group_id=run.group_id,
            period_start=run.period_start,
            period_end=run.period_end,
            status=run.status,
            created_at=run.created_at,
            completed_at=run.completed_at,
            selected_entity_ids=[UUID(item) for item in run.selected_entity_ids_json],
            fx_rates={key: Decimal(str(value)) for key, value in (run.fx_rates_json or {}).items()},
            elimination_summary=run.elimination_summary_json,
            balance_sheet=ConsolidatedBalanceSheetResponse.model_validate(snapshot["balance_sheet"]) if snapshot.get("balance_sheet") else None,
            income_statement=ConsolidatedIncomeStatementResponse.model_validate(snapshot["income_statement"]) if snapshot.get("income_statement") else None,
            trial_balance=ConsolidatedTrialBalanceResponse.model_validate(snapshot["trial_balance"]) if snapshot.get("trial_balance") else None,
        )
