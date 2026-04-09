from pydantic import BaseModel, Field

from app.core.enums import BillingInterval, SubscriptionStatus


class PlanResponse(BaseModel):
    code: str
    plan_id: str
    name: str
    tier: str
    is_public: bool
    is_enterprise: bool
    contact_sales_only: bool
    default_trial_days: int
    intervals: list[BillingInterval]
    pricing: dict[str, int | str]
    features: dict[str, bool]
    feature_bundle: dict[str, bool]
    limits: dict[str, int | str]


class BillingAccountResponse(BaseModel):
    id: str
    organization_id: str
    status: str
    scope_type: str
    billing_email: str | None = None
    billing_contact_name: str | None = None
    currency: str
    country: str | None = None
    tax_id: str | None = None
    is_billing_exempt: bool


class SubscriptionResponse(BaseModel):
    id: str
    plan_code: str
    status: SubscriptionStatus
    billing_interval: BillingInterval
    trial_start_at: str | None = None
    trial_end_at: str | None = None
    current_period_start: str | None = None
    current_period_end: str | None = None
    cancel_at_period_end: bool
    seats_purchased: int


class EntitlementOverrideResponse(BaseModel):
    id: str
    entitlement_key: str
    enabled: bool
    limit_value: int | None = None
    reason: str | None = None


class CommercialStateResponse(BaseModel):
    account: BillingAccountResponse
    subscription: SubscriptionResponse
    features: dict[str, bool]
    limits: dict[str, int | str]
    usage: dict[str, dict[str, int | bool | None]]
    overrides: list[EntitlementOverrideResponse]


class ChangePlanRequest(BaseModel):
    plan_code: str
    billing_interval: BillingInterval = BillingInterval.MONTHLY
    seats: int | None = Field(default=None, ge=1)


class CancelPolicyRequest(BaseModel):
    cancel_at_period_end: bool


class EntitlementOverrideRequest(BaseModel):
    entitlement_key: str
    enabled: bool = True
    limit_value: int | None = Field(default=None, ge=0)
    reason: str | None = Field(default=None, max_length=255)
