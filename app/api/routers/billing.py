from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.schemas.billing import (
    CancelPolicyRequest,
    ChangePlanRequest,
    CommercialStateResponse,
    EntitlementOverrideRequest,
    PlanResponse,
)
from app.services.billing_service import BillingService

router = APIRouter(tags=["billing"])


@router.get("/public/plans", response_model=list[PlanResponse])
def list_public_plans(db: Session = Depends(get_db)):
    plans = BillingService(db).list_plans(include_private=False)
    return [
        PlanResponse(
            code=plan.code,
            plan_id=plan.plan_id,
            name=plan.name,
            tier=plan.tier,
            is_public=plan.is_public,
            is_enterprise=plan.is_enterprise,
            contact_sales_only=plan.contact_sales_only,
            default_trial_days=plan.default_trial_days,
            intervals=list(plan.intervals),
            pricing=plan.pricing,
            features=plan.features,
            feature_bundle=plan.feature_bundle,
            limits=plan.limits,
        )
        for plan in plans
    ]


@router.get("/organizations/{organization_id}/billing/state", response_model=CommercialStateResponse)
def commercial_state(organization_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("settings.read")), db: Session = Depends(get_db)):
    state = BillingService(db).get_commercial_state(organization_id, requested_by_user_id=current_user.id)
    return CommercialStateResponse(
        account={
            "id": str(state["account"].id),
            "organization_id": str(state["account"].organization_id),
            "status": state["account"].status.value,
            "scope_type": state["account"].scope_type.value,
            "billing_email": state["account"].billing_email,
            "billing_contact_name": state["account"].billing_contact_name,
            "currency": state["account"].currency,
            "country": state["account"].country,
            "tax_id": state["account"].tax_id,
            "is_billing_exempt": state["account"].is_billing_exempt,
        },
        subscription={
            "id": str(state["subscription"].id),
            "plan_code": state["subscription"].plan_code,
            "status": state["subscription"].status,
            "billing_interval": state["subscription"].billing_interval,
            "trial_start_at": state["subscription"].trial_start_at,
            "trial_end_at": state["subscription"].trial_end_at,
            "current_period_start": state["subscription"].current_period_start,
            "current_period_end": state["subscription"].current_period_end,
            "cancel_at_period_end": state["subscription"].cancel_at_period_end,
            "seats_purchased": state["subscription"].seats_purchased,
        },
        features=state["features"],
        limits=state["limits"],
        usage=state["usage"],
        overrides=[
            {
                "id": str(override.id),
                "entitlement_key": override.entitlement_key,
                "enabled": override.enabled,
                "limit_value": override.limit_value,
                "reason": override.reason,
            }
            for override in state["overrides"]
        ],
    )


@router.post("/organizations/{organization_id}/billing/change-plan", response_model=CommercialStateResponse)
def change_plan(organization_id: str, payload: ChangePlanRequest, current_user=Depends(get_current_user), _=Depends(require_permission("settings.update")), db: Session = Depends(get_db)):
    BillingService(db).change_plan(
        organization_id,
        plan_code=payload.plan_code,
        interval=payload.billing_interval,
        actor_user_id=current_user.id,
        seats=payload.seats,
    )
    return commercial_state(organization_id, current_user, _, db)


@router.post("/organizations/{organization_id}/billing/cancel-policy", response_model=CommercialStateResponse)
def update_cancel_policy(organization_id: str, payload: CancelPolicyRequest, current_user=Depends(get_current_user), _=Depends(require_permission("settings.update")), db: Session = Depends(get_db)):
    BillingService(db).set_cancel_at_period_end(organization_id, actor_user_id=current_user.id, cancel_at_period_end=payload.cancel_at_period_end)
    return commercial_state(organization_id, current_user, _, db)


@router.post("/organizations/{organization_id}/billing/overrides", response_model=CommercialStateResponse)
def set_override(organization_id: str, payload: EntitlementOverrideRequest, current_user=Depends(get_current_user), _=Depends(require_permission("settings.update")), db: Session = Depends(get_db)):
    BillingService(db).apply_override(
        organization_id,
        actor_user_id=current_user.id,
        entitlement_key=payload.entitlement_key,
        enabled=payload.enabled,
        limit_value=payload.limit_value,
        reason=payload.reason,
    )
    return commercial_state(organization_id, current_user, _, db)
