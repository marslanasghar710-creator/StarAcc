from dataclasses import dataclass

from app.core.enums import BillingInterval


@dataclass(frozen=True)
class PlanDefinition:
    plan_id: str
    name: str
    pricing: dict[str, int | str]
    limits: dict[str, int | str]
    features: dict[str, bool]
    code: str
    tier: str
    is_public: bool
    is_enterprise: bool
    contact_sales_only: bool
    default_trial_days: int
    intervals: tuple[BillingInterval, ...]

    @property
    def feature_bundle(self) -> dict[str, bool]:
        return {
            "invoicing": True,
            "bills": True,
            "exports": self.features["exports"],
            "consolidation": self.features["consolidation"],
            "integrations_basic": self.features["integrations"],
            "integrations_advanced": self.features["integrations"],
            "custom_reports": self.features["advanced_reporting"],
            "bank_reconciliation": True,
            "payroll": self.plan_id == "pro",
            "ai_automation": self.plan_id in {"growth", "pro"},
            "audit_log_access": self.features["audit_log_access"],
            "api_access": self.features["api_access"],
            "accounting_core": True,
            "advanced_exports": self.features["advanced_reporting"],
        }


PLAN_CATALOG: dict[str, PlanDefinition] = {
    "starter": PlanDefinition(
        plan_id="starter",
        code="starter",
        tier="starter",
        name="Starter",
        pricing={"monthly_price": 0, "yearly_price": 0, "currency": "USD"},
        limits={
            "max_entities": 1,
            "max_users": 2,
            "max_invoices_per_month": 50,
            "max_bills_per_month": 50,
            "max_bank_accounts": 1,
            "max_integrations": 0,
            "seats": 2,
            "entities": 1,
            "custom_reports": 5,
            "payroll_employees": 0,
        },
        features={
            "advanced_reporting": False,
            "consolidation": False,
            "exports": True,
            "audit_log_access": True,
            "integrations": False,
            "api_access": False,
        },
        is_public=True,
        is_enterprise=False,
        contact_sales_only=False,
        default_trial_days=14,
        intervals=(BillingInterval.MONTHLY, BillingInterval.YEARLY),
    ),
    "growth": PlanDefinition(
        plan_id="growth",
        code="growth",
        tier="growth",
        name="Growth",
        pricing={"monthly_price": 49, "yearly_price": 470, "currency": "USD"},
        limits={
            "max_entities": 5,
            "max_users": 10,
            "max_invoices_per_month": 500,
            "max_bills_per_month": 500,
            "max_bank_accounts": 5,
            "max_integrations": 3,
            "seats": 10,
            "entities": 5,
            "custom_reports": 25,
            "payroll_employees": 0,
        },
        features={
            "advanced_reporting": True,
            "consolidation": False,
            "exports": True,
            "audit_log_access": True,
            "integrations": True,
            "api_access": False,
        },
        is_public=True,
        is_enterprise=False,
        contact_sales_only=False,
        default_trial_days=21,
        intervals=(BillingInterval.MONTHLY, BillingInterval.YEARLY),
    ),
    "pro": PlanDefinition(
        plan_id="pro",
        code="pro",
        tier="pro",
        name="Pro",
        pricing={"monthly_price": 129, "yearly_price": 1238, "currency": "USD"},
        limits={
            "max_entities": "unlimited",
            "max_users": "unlimited",
            "max_invoices_per_month": "unlimited",
            "max_bills_per_month": "unlimited",
            "max_bank_accounts": "unlimited",
            "max_integrations": "unlimited",
            "seats": 999999,
            "entities": 999999,
            "custom_reports": 999999,
            "payroll_employees": 999999,
        },
        features={
            "advanced_reporting": True,
            "consolidation": True,
            "exports": True,
            "audit_log_access": True,
            "integrations": True,
            "api_access": True,
        },
        is_public=True,
        is_enterprise=False,
        contact_sales_only=False,
        default_trial_days=21,
        intervals=(BillingInterval.MONTHLY, BillingInterval.YEARLY),
    ),
}


def get_plan_or_raise(plan_code: str) -> PlanDefinition:
    plan = PLAN_CATALOG.get(plan_code)
    if not plan:
        raise ValueError(f"Unknown plan code: {plan_code}")
    return plan
