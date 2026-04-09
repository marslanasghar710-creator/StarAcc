from datetime import datetime, timedelta, timezone

UTC = timezone.utc

from app.billing.plan_catalog import PLAN_CATALOG, get_plan_or_raise
from app.core.enums import BillingAccountStatus, BillingInterval, BillingScopeType, MembershipStatus, SubscriptionStatus
from app.core.exceptions import bad_request, forbidden
from app.db.models import Organization
from app.repositories.audit import AuditRepository
from app.repositories.billing_repository import BillingRepository
from app.repositories.membership import MembershipRepository
from app.repositories.payroll_repository import PayrollRepository
from app.services.usage_service import UsageService


class BillingService:
    def __init__(self, db):
        self.db = db
        self.repo = BillingRepository(db)
        self.usage_service = UsageService(db)

    def get_or_create_billing_context(self, organization_id: str, *, requested_by_user_id=None):
        account = self.repo.get_account_by_org(organization_id)
        if not account:
            organization = self.db.get(Organization, organization_id)
            account = self.repo.create_account(
                organization_id=organization_id,
                scope_type=BillingScopeType.ORGANIZATION,
                status=BillingAccountStatus.ACTIVE,
                currency="USD",
                is_billing_exempt=bool(organization.is_demo) if organization else False,
            )
            now = datetime.now(UTC)
            plan = PLAN_CATALOG["starter"]
            self.repo.create_subscription(
                billing_account_id=account.id,
                plan_code=plan.code,
                status=SubscriptionStatus.TRIALING,
                billing_interval=BillingInterval.MONTHLY,
                trial_start_at=now.isoformat(),
                trial_end_at=(now + timedelta(days=plan.default_trial_days)).isoformat(),
                current_period_start=now.isoformat(),
                current_period_end=(now + timedelta(days=plan.default_trial_days)).isoformat(),
                seats_purchased=plan.limits["seats"],
            )
            if requested_by_user_id:
                AuditRepository(self.db).create(
                    organization_id=organization_id,
                    actor_user_id=requested_by_user_id,
                    action="billing.account.initialized",
                    entity_type="billing_account",
                    entity_id=str(account.id),
                    metadata_json={"default_plan": plan.code},
                )
        subscription = self.repo.get_active_subscription(account.id)
        return account, subscription

    def list_plans(self, *, include_private=False):
        plans = list(PLAN_CATALOG.values())
        if include_private:
            return plans
        return [p for p in plans if p.is_public]

    def compute_usage(self, organization_id: str, subscription) -> dict[str, dict[str, int | str | bool | None]]:
        members = MembershipRepository(self.db).list_members(organization_id)
        active_members = len([m for m in members if m.status == MembershipStatus.ACTIVE and m.deleted_at is None])
        active_payroll_employees = PayrollRepository(self.db).count_active_employees(organization_id)
        plan = get_plan_or_raise(subscription.plan_code)
        usage_snapshot = self.usage_service.get_snapshot(organization_id)

        usage = {
            "seats": {
                "used": active_members,
                "limit": subscription.seats_purchased,
                "within_limit": active_members <= subscription.seats_purchased,
            },
            "payroll_employees": {
                "used": active_payroll_employees,
                "limit": plan.limits.get("payroll_employees"),
                "within_limit": active_payroll_employees <= int(plan.limits.get("payroll_employees", 0)),
            },
            "invoices_this_period": {
                "used": usage_snapshot.invoices_this_period,
                "limit": plan.limits.get("max_invoices_per_month"),
                "within_limit": plan.limits.get("max_invoices_per_month") == "unlimited" or usage_snapshot.invoices_this_period <= int(plan.limits.get("max_invoices_per_month", 0)),
            },
            "bills_this_period": {
                "used": usage_snapshot.bills_this_period,
                "limit": plan.limits.get("max_bills_per_month"),
                "within_limit": plan.limits.get("max_bills_per_month") == "unlimited" or usage_snapshot.bills_this_period <= int(plan.limits.get("max_bills_per_month", 0)),
            },
            "users_count": {
                "used": usage_snapshot.users_count,
                "limit": plan.limits.get("max_users"),
                "within_limit": plan.limits.get("max_users") == "unlimited" or usage_snapshot.users_count <= int(plan.limits.get("max_users", 0)),
            },
            "bank_accounts_count": {
                "used": usage_snapshot.bank_accounts_count,
                "limit": plan.limits.get("max_bank_accounts"),
                "within_limit": plan.limits.get("max_bank_accounts") == "unlimited" or usage_snapshot.bank_accounts_count <= int(plan.limits.get("max_bank_accounts", 0)),
            },
            "integrations_count": {
                "used": usage_snapshot.integrations_count,
                "limit": plan.limits.get("max_integrations"),
                "within_limit": plan.limits.get("max_integrations") == "unlimited" or usage_snapshot.integrations_count <= int(plan.limits.get("max_integrations", 0)),
            },
        }
        for key, row in usage.items():
            limit = row["limit"]
            self.repo.upsert_usage_snapshot(
                subscription.id,
                key,
                int(row["used"]),
                int(limit) if isinstance(limit, int) else None,
                "within_limit" if row["within_limit"] else "limit_exceeded",
            )
        return usage

    def get_commercial_state(self, organization_id: str, *, requested_by_user_id=None):
        account, subscription = self.get_or_create_billing_context(organization_id, requested_by_user_id=requested_by_user_id)
        plan = get_plan_or_raise(subscription.plan_code)
        usage = self.compute_usage(organization_id, subscription)
        overrides = self.repo.list_overrides(subscription.id)
        override_map = {item.entitlement_key: item for item in overrides}

        features = {}
        for key, enabled in plan.feature_bundle.items():
            override = override_map.get(key)
            features[key] = override.enabled if override else enabled

        limits = dict(plan.limits)
        limits["seats"] = subscription.seats_purchased
        for key in list(limits.keys()):
            override = override_map.get(key)
            if override and override.limit_value is not None:
                limits[key] = override.limit_value

        return {
            "account": account,
            "subscription": subscription,
            "plan": plan,
            "features": features,
            "limits": limits,
            "usage": usage,
            "overrides": overrides,
        }

    def ensure_feature(self, organization_id: str, feature_key: str):
        state = self.get_commercial_state(organization_id)
        if state["account"].is_billing_exempt:
            return state
        if state["subscription"].status in {SubscriptionStatus.UNPAID, SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELED}:
            raise forbidden("Subscription status does not allow this action")
        if not state["features"].get(feature_key, False):
            raise forbidden(f"Feature '{feature_key}' is not included in current plan")
        return state

    def enforce_limit(self, organization_id: str, limit_key: str, *, projected_usage: int | None = None):
        state = self.get_commercial_state(organization_id)
        if state["account"].is_billing_exempt:
            return state
        limit = state["limits"].get(limit_key)
        if limit is None:
            return state
        used = projected_usage if projected_usage is not None else state["usage"].get(limit_key, {}).get("used", 0)
        if used > limit:
            raise forbidden(f"Usage limit exceeded for '{limit_key}' ({used}/{limit})")
        return state

    def change_plan(self, organization_id: str, *, plan_code: str, interval: BillingInterval, actor_user_id, seats: int | None = None):
        account, current_subscription = self.get_or_create_billing_context(organization_id, requested_by_user_id=actor_user_id)
        plan = get_plan_or_raise(plan_code)
        AuditRepository(self.db).create(organization_id=organization_id, actor_user_id=actor_user_id, action="billing.upgrade_started", entity_type="billing", entity_id=str(account.id), metadata_json={"from": current_subscription.plan_code, "to": plan_code})
        if plan.contact_sales_only:
            raise bad_request("Selected plan requires sales-assisted provisioning")

        now = datetime.now(UTC)
        period_days = 365 if interval == BillingInterval.YEARLY else 30
        new_subscription = self.repo.create_subscription(
            billing_account_id=account.id,
            plan_code=plan.code,
            status=SubscriptionStatus.ACTIVE,
            billing_interval=interval,
            trial_start_at=current_subscription.trial_start_at,
            trial_end_at=current_subscription.trial_end_at,
            current_period_start=now.isoformat(),
            current_period_end=(now + timedelta(days=period_days)).isoformat(),
            seats_purchased=seats or plan.limits["seats"],
            metadata_json={"transitioned_from": current_subscription.plan_code},
        )

        current_subscription.deleted_at = now
        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="billing.subscription.changed",
            entity_type="subscription",
            entity_id=str(new_subscription.id),
            metadata_json={"from": current_subscription.plan_code, "to": plan.code, "interval": interval.value},
        )
        from_price = int(get_plan_or_raise(current_subscription.plan_code).pricing.get("monthly_price", 0))
        to_price = int(plan.pricing.get("monthly_price", 0))
        transition_event = "billing.upgrade_completed" if to_price >= from_price else "billing.downgrade_completed"
        AuditRepository(self.db).create(organization_id=organization_id, actor_user_id=actor_user_id, action=transition_event, entity_type="billing", entity_id=str(new_subscription.id), metadata_json={"from": current_subscription.plan_code, "to": plan.code})
        self.db.commit()
        self.db.refresh(new_subscription)
        return new_subscription

    def set_cancel_at_period_end(self, organization_id: str, *, actor_user_id, cancel_at_period_end: bool):
        _, subscription = self.get_or_create_billing_context(organization_id, requested_by_user_id=actor_user_id)
        subscription.cancel_at_period_end = cancel_at_period_end
        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="billing.subscription.cancel_policy_updated",
            entity_type="subscription",
            entity_id=str(subscription.id),
            metadata_json={"cancel_at_period_end": cancel_at_period_end},
        )
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def apply_override(self, organization_id: str, *, actor_user_id, entitlement_key: str, enabled: bool, limit_value: int | None, reason: str | None):
        _, subscription = self.get_or_create_billing_context(organization_id, requested_by_user_id=actor_user_id)
        override = self.repo.upsert_override(subscription.id, entitlement_key, enabled, limit_value, reason)
        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="billing.entitlement.override",
            entity_type="subscription_entitlement_override",
            entity_id=str(override.id),
            metadata_json={"entitlement_key": entitlement_key, "enabled": enabled, "limit_value": limit_value, "reason": reason},
        )
        self.db.commit()
        self.db.refresh(override)
        return override
