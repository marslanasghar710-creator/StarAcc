import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import BillingAccountStatus, BillingInterval, BillingScopeType, SubscriptionStatus
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class BillingAccount(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "billing_accounts"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    scope_type: Mapped[BillingScopeType] = mapped_column(
        Enum(BillingScopeType, name="billing_scope_type", values_callable=lambda e: [item.value for item in e]),
        nullable=False,
        default=BillingScopeType.ORGANIZATION,
    )
    status: Mapped[BillingAccountStatus] = mapped_column(
        Enum(BillingAccountStatus, name="billing_account_status", values_callable=lambda e: [item.value for item in e]),
        nullable=False,
        default=BillingAccountStatus.ACTIVE,
    )
    provider_customer_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    billing_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_contact_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_billing_exempt: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class Subscription(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "subscriptions"

    billing_account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("billing_accounts.id"), nullable=False, index=True)
    plan_code: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status", values_callable=lambda e: [item.value for item in e]),
        nullable=False,
        default=SubscriptionStatus.TRIALING,
    )
    billing_interval: Mapped[BillingInterval] = mapped_column(
        Enum(BillingInterval, name="billing_interval", values_callable=lambda e: [item.value for item in e]),
        nullable=False,
        default=BillingInterval.MONTHLY,
    )
    trial_start_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    trial_end_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    current_period_start: Mapped[str | None] = mapped_column(String(40), nullable=True)
    current_period_end: Mapped[str | None] = mapped_column(String(40), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    canceled_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    provider_subscription_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    seats_purchased: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class SubscriptionEntitlementOverride(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "subscription_entitlement_overrides"
    __table_args__ = (UniqueConstraint("subscription_id", "entitlement_key", name="uq_subscription_entitlement_override"),)

    subscription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=False, index=True)
    entitlement_key: Mapped[str] = mapped_column(String(120), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    limit_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)


class UsageSnapshot(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "billing_usage_snapshots"
    __table_args__ = (UniqueConstraint("subscription_id", "metric_key", name="uq_billing_usage_snapshot"),)

    subscription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=False, index=True)
    metric_key: Mapped[str] = mapped_column(String(120), nullable=False)
    used_value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    limit_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="within_limit")


class PlanPrice(Base):
    __tablename__ = "plan_prices"
    __table_args__ = (UniqueConstraint("plan_code", "interval", name="uq_plan_price_plan_interval"),)

    plan_code: Mapped[str] = mapped_column(String(80), primary_key=True)
    interval: Mapped[BillingInterval] = mapped_column(
        Enum(BillingInterval, name="plan_price_interval", values_callable=lambda e: [item.value for item in e]), primary_key=True
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
