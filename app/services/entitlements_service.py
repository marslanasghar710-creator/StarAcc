from __future__ import annotations

from fastapi import HTTPException, status

from app.billing.plan_catalog import PLAN_CATALOG, PlanDefinition
from app.repositories.audit import AuditRepository
from app.services.billing_service import BillingService
from app.services.usage_service import UsageService

LIMIT_USAGE_KEY_MAP = {
    "max_entities": "entities_count",
    "max_users": "users_count",
    "max_invoices_per_month": "invoices_this_period",
    "max_bills_per_month": "bills_this_period",
    "max_bank_accounts": "bank_accounts_count",
    "max_integrations": "integrations_count",
}


class EntitlementsService:
    def __init__(self, db):
        self.db = db
        self.billing = BillingService(db)
        self.usage = UsageService(db)

    def get_plan(self, org_id: str) -> str:
        _, subscription = self.billing.get_or_create_billing_context(org_id)
        return subscription.plan_code

    def get_plan_definition(self, plan_id: str) -> PlanDefinition:
        plan = PLAN_CATALOG.get(plan_id)
        if not plan:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown plan '{plan_id}'")
        return plan

    def check_feature(self, org_id: str, feature: str) -> bool:
        plan_id = self.get_plan(org_id)
        plan = self.get_plan_definition(plan_id)
        return bool(plan.features.get(feature, False))

    def check_limit(self, org_id: str, limit_key: str) -> dict[str, int | str | bool]:
        plan_id = self.get_plan(org_id)
        plan = self.get_plan_definition(plan_id)
        usage = self.usage.get_snapshot(org_id)
        usage_attr = LIMIT_USAGE_KEY_MAP.get(limit_key)
        if not usage_attr:
            return {"allowed": True, "current": 0, "limit": "unlimited"}
        current = int(getattr(usage, usage_attr))
        limit = plan.limits.get(limit_key, "unlimited")
        allowed = limit == "unlimited" or current < int(limit)
        return {"allowed": allowed, "current": current, "limit": limit}

    def enforce_feature(self, org_id: str, feature: str):
        allowed = self.check_feature(org_id, feature)
        if allowed:
            return
        required_plan = self._required_plan_for_feature(feature)
        AuditRepository(self.db).create(
            organization_id=org_id,
            actor_user_id=None,
            action="entitlement.feature_blocked",
            entity_type="entitlement",
            entity_id=feature,
            metadata_json={"feature": feature, "required_plan": required_plan},
        )
        self.db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "FEATURE_NOT_AVAILABLE", "feature": feature, "required_plan": required_plan},
        )

    def enforce_limit(self, org_id: str, limit_key: str):
        result = self.check_limit(org_id, limit_key)
        if result["allowed"]:
            return
        required_plan = self._required_plan_for_limit(limit_key)
        AuditRepository(self.db).create(
            organization_id=org_id,
            actor_user_id=None,
            action="entitlement.limit_reached",
            entity_type="entitlement",
            entity_id=limit_key,
            metadata_json={
                "limit_key": limit_key,
                "current": result["current"],
                "limit": result["limit"],
                "required_plan": required_plan,
            },
        )
        self.db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "LIMIT_EXCEEDED",
                "limit_key": limit_key,
                "current": result["current"],
                "limit": result["limit"],
                "required_plan": required_plan,
            },
        )

    def _required_plan_for_feature(self, feature: str) -> str:
        for candidate in ["starter", "growth", "pro"]:
            if PLAN_CATALOG[candidate].features.get(feature):
                return candidate
        return "pro"

    def _required_plan_for_limit(self, limit_key: str) -> str:
        for candidate in ["starter", "growth", "pro"]:
            limit = PLAN_CATALOG[candidate].limits.get(limit_key, "unlimited")
            if limit == "unlimited":
                return candidate
            if isinstance(limit, int) and limit > 0:
                return candidate
        return "pro"
