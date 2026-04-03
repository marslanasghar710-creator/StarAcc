from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import BillingAccount, Subscription, SubscriptionEntitlementOverride, UsageSnapshot


class BillingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_account_by_org(self, organization_id: str):
        return self.db.scalar(
            select(BillingAccount).where(BillingAccount.organization_id == organization_id, BillingAccount.deleted_at.is_(None))
        )

    def create_account(self, **kwargs) -> BillingAccount:
        row = BillingAccount(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_active_subscription(self, billing_account_id):
        return self.db.scalar(
            select(Subscription)
            .where(Subscription.billing_account_id == billing_account_id, Subscription.deleted_at.is_(None))
            .order_by(Subscription.created_at.desc())
        )

    def create_subscription(self, **kwargs) -> Subscription:
        row = Subscription(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def list_overrides(self, subscription_id):
        return list(
            self.db.scalars(
                select(SubscriptionEntitlementOverride).where(
                    SubscriptionEntitlementOverride.subscription_id == subscription_id,
                    SubscriptionEntitlementOverride.deleted_at.is_(None),
                )
            ).all()
        )

    def upsert_override(self, subscription_id, entitlement_key: str, enabled: bool, limit_value: int | None, reason: str | None):
        existing = self.db.scalar(
            select(SubscriptionEntitlementOverride).where(
                SubscriptionEntitlementOverride.subscription_id == subscription_id,
                SubscriptionEntitlementOverride.entitlement_key == entitlement_key,
                SubscriptionEntitlementOverride.deleted_at.is_(None),
            )
        )
        if existing:
            existing.enabled = enabled
            existing.limit_value = limit_value
            existing.reason = reason
            self.db.flush()
            return existing
        row = SubscriptionEntitlementOverride(
            subscription_id=subscription_id,
            entitlement_key=entitlement_key,
            enabled=enabled,
            limit_value=limit_value,
            reason=reason,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def upsert_usage_snapshot(self, subscription_id, metric_key: str, used_value: int, limit_value: int | None, status: str):
        existing = self.db.scalar(
            select(UsageSnapshot).where(UsageSnapshot.subscription_id == subscription_id, UsageSnapshot.metric_key == metric_key)
        )
        if existing:
            existing.used_value = used_value
            existing.limit_value = limit_value
            existing.status = status
            self.db.flush()
            return existing
        row = UsageSnapshot(
            subscription_id=subscription_id,
            metric_key=metric_key,
            used_value=used_value,
            limit_value=limit_value,
            status=status,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def list_usage_snapshots(self, subscription_id):
        return list(self.db.scalars(select(UsageSnapshot).where(UsageSnapshot.subscription_id == subscription_id)).all())
