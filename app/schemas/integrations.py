from pydantic import BaseModel, Field

from app.core.enums import IntegrationConnectionStatus, IntegrationSyncDirection, IntegrationSyncStatus


class IntegrationProviderResponse(BaseModel):
    key: str
    name: str
    category: str
    status: str
    auth_type: str
    capabilities: dict
    supports_webhooks: bool
    supports_scheduled_sync: bool
    supports_push: bool
    supports_pull: bool
    supports_manual_import: bool
    is_public: bool
    is_internal: bool
    required_feature: str | None = None
    is_entitled: bool


class IntegrationConnectionResponse(BaseModel):
    id: str
    provider_key: str
    display_name: str
    status: IntegrationConnectionStatus
    connection_mode: str
    external_account_id: str | None = None
    last_sync_at: str | None = None
    last_success_at: str | None = None
    last_error_at: str | None = None
    last_error_code: str | None = None
    last_error_message: str | None = None
    config_json: dict
    metadata_json: dict


class CreateIntegrationConnectionRequest(BaseModel):
    provider_key: str
    display_name: str
    connection_mode: str = "manual"
    config: dict = Field(default_factory=dict)
    secret_ref: str | None = None


class IntegrationSyncRunResponse(BaseModel):
    id: str
    provider_key: str
    sync_type: str
    direction: IntegrationSyncDirection
    status: IntegrationSyncStatus
    triggered_by: str
    started_at: str | None = None
    completed_at: str | None = None
    records_seen: int
    records_created: int
    records_updated: int
    records_skipped: int
    records_failed: int
    cursor_before: str | None = None
    cursor_after: str | None = None
    error_summary: str | None = None


class TriggerSyncRequest(BaseModel):
    direction: IntegrationSyncDirection = IntegrationSyncDirection.PULL


class DisconnectResponse(BaseModel):
    message: str


class IngestWebhookRequest(BaseModel):
    provider_key: str
    event_id: str
    event_type: str
    payload: dict = Field(default_factory=dict)
    signature_valid: bool = False
    organization_id: str | None = None
    connection_id: str | None = None


class WebhookEventResponse(BaseModel):
    id: str
    provider_key: str
    event_id: str
    event_type: str
    signature_valid: bool
    status: str
    error_message: str | None = None
    deduped: bool
