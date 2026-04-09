from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


EventName = Literal[
    "marketing.landing.viewed",
    "marketing.section.viewed",
    "marketing.cta.clicked",
    "marketing.faq.toggled",
    "marketing.nav.clicked",
    "pricing.page.viewed",
    "pricing.plan.selected",
    "demo.entry.started",
    "demo.workspace.entered",
    "demo.module.viewed",
    "demo.convert_to_signup.clicked",
    "auth.signup.started",
    "auth.signup.submitted",
    "auth.signup.completed",
    "auth.login.completed",
    "auth.error.shown",
    "workspace.creation.started",
    "workspace.creation.submitted",
    "workspace.creation.completed",
    "workspace.creation.failed",
    "workspace.bootstrap.completed",
    "activation.flow.entered",
    "activation.checklist.viewed",
    "activation.checklist_item.completed",
    "activation.milestone.reached",
    "activation.completed",
    "app.handoff.completed",
    "entitlement.limit_reached",
    "entitlement.feature_blocked",
]


class FunnelEventRequest(BaseModel):
    event_name: EventName
    event_version: int = Field(ge=1)
    occurred_at: datetime
    session_id: str = Field(min_length=4, max_length=120)
    anonymous_id: str = Field(min_length=4, max_length=120)
    user_id: str | None = Field(default=None, max_length=120)
    org_id: str | None = Field(default=None, max_length=120)
    workspace_id: str | None = Field(default=None, max_length=120)

    route: str | None = Field(default=None, max_length=240)
    path: str | None = Field(default=None, max_length=240)
    page_type: str | None = Field(default=None, max_length=32)
    surface: str | None = Field(default=None, max_length=64)
    funnel_domain: str = Field(min_length=2, max_length=32)
    funnel_stage: str = Field(min_length=2, max_length=32)

    is_demo: bool
    is_authenticated: bool
    environment: str | None = Field(default=None, max_length=32)

    referrer: str | None = Field(default=None, max_length=500)
    utm_source: str | None = Field(default=None, max_length=120)
    utm_medium: str | None = Field(default=None, max_length=120)
    utm_campaign: str | None = Field(default=None, max_length=120)
    utm_term: str | None = Field(default=None, max_length=120)
    utm_content: str | None = Field(default=None, max_length=120)

    landing_variant: str | None = Field(default=None, max_length=64)
    experiment_assignments: dict[str, str] | None = None

    device_type: str | None = Field(default=None, max_length=24)
    viewport_bucket: str | None = Field(default=None, max_length=16)
    locale: str | None = Field(default=None, max_length=32)
    timezone: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=16)

    payload: dict = Field(default_factory=dict)


class FunnelEventResponse(BaseModel):
    accepted: bool
