from dataclasses import dataclass

from app.core.enums import BillingInterval


@dataclass(frozen=True)
class PlanDefinition:
    code: str
    name: str
    tier: str
    is_public: bool
    is_enterprise: bool
    contact_sales_only: bool
    default_trial_days: int
    intervals: tuple[BillingInterval, ...]
    feature_bundle: dict[str, bool]
    limits: dict[str, int]


PLAN_CATALOG: dict[str, PlanDefinition] = {
    "starter": PlanDefinition(
        code="starter",
        name="Starter",
        tier="starter",
        is_public=True,
        is_enterprise=False,
        contact_sales_only=False,
        default_trial_days=14,
        intervals=(BillingInterval.MONTHLY, BillingInterval.YEARLY),
        feature_bundle={
            "accounting_core": True,
            "invoicing": True,
            "bills": True,
            "bank_reconciliation": False,
            "custom_reports": False,
            "consolidation": False,
            "payroll": False,
            "ai_automation": False,
            "exports": True,
            "advanced_exports": False,
            "integrations_basic": False,
            "integrations_advanced": False,
        },
        limits={"seats": 3, "entities": 1, "custom_reports": 5, "payroll_employees": 0},
    ),
    "growth": PlanDefinition(
        code="growth",
        name="Growth",
        tier="growth",
        is_public=True,
        is_enterprise=False,
        contact_sales_only=False,
        default_trial_days=21,
        intervals=(BillingInterval.MONTHLY, BillingInterval.YEARLY),
        feature_bundle={
            "accounting_core": True,
            "invoicing": True,
            "bills": True,
            "bank_reconciliation": True,
            "custom_reports": True,
            "consolidation": False,
            "payroll": False,
            "ai_automation": True,
            "exports": True,
            "advanced_exports": True,
            "integrations_basic": True,
            "integrations_advanced": False,
        },
        limits={"seats": 10, "entities": 1, "custom_reports": 25, "payroll_employees": 0},
    ),
    "advanced": PlanDefinition(
        code="advanced",
        name="Advanced / Multi-Entity",
        tier="advanced",
        is_public=True,
        is_enterprise=False,
        contact_sales_only=False,
        default_trial_days=21,
        intervals=(BillingInterval.MONTHLY, BillingInterval.YEARLY),
        feature_bundle={
            "accounting_core": True,
            "invoicing": True,
            "bills": True,
            "bank_reconciliation": True,
            "custom_reports": True,
            "consolidation": True,
            "payroll": True,
            "ai_automation": True,
            "exports": True,
            "advanced_exports": True,
            "integrations_basic": True,
            "integrations_advanced": True,
        },
        limits={"seats": 30, "entities": 8, "custom_reports": 200, "payroll_employees": 500},
    ),
    "enterprise": PlanDefinition(
        code="enterprise",
        name="Enterprise / Custom",
        tier="enterprise",
        is_public=False,
        is_enterprise=True,
        contact_sales_only=True,
        default_trial_days=0,
        intervals=(BillingInterval.MONTHLY, BillingInterval.YEARLY),
        feature_bundle={
            "accounting_core": True,
            "invoicing": True,
            "bills": True,
            "bank_reconciliation": True,
            "custom_reports": True,
            "consolidation": True,
            "payroll": True,
            "ai_automation": True,
            "exports": True,
            "advanced_exports": True,
            "integrations_basic": True,
            "integrations_advanced": True,
        },
        limits={"seats": 999999, "entities": 999999, "custom_reports": 999999, "payroll_employees": 999999},
    ),
}


def get_plan_or_raise(plan_code: str) -> PlanDefinition:
    plan = PLAN_CATALOG.get(plan_code)
    if not plan:
        raise ValueError(f"Unknown plan code: {plan_code}")
    return plan
