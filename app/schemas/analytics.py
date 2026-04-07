from datetime import datetime
from pydantic import BaseModel, Field


class FunnelEventRequest(BaseModel):
    event_name: str = Field(min_length=3, max_length=120)
    timestamp: datetime
    anonymous_id: str | None = Field(default=None, max_length=120)
    user_id: str | None = Field(default=None, max_length=120)
    organization_id: str | None = Field(default=None, max_length=120)
    session_id: str | None = Field(default=None, max_length=120)
    route: str | None = Field(default=None, max_length=240)
    referrer: str | None = Field(default=None, max_length=500)
    source: str | None = Field(default=None, max_length=120)
    campaign: str | None = Field(default=None, max_length=120)
    medium: str | None = Field(default=None, max_length=120)
    term: str | None = Field(default=None, max_length=120)
    content: str | None = Field(default=None, max_length=120)
    experience: str | None = Field(default=None, max_length=32)
    experiment_bucket: str | None = Field(default=None, max_length=64)
    metadata: dict | None = None


class FunnelEventResponse(BaseModel):
    accepted: bool
