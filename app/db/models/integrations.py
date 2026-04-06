import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import (
    IntegrationAuthType,
    IntegrationConnectionStatus,
    IntegrationCredentialStatus,
    IntegrationSyncDirection,
    IntegrationSyncStatus,
    IntegrationSyncType,
)
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class IntegrationProvider(Base):
    __tablename__ = "integration_providers"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="available")
    auth_type: Mapped[IntegrationAuthType] = mapped_column(
        Enum(IntegrationAuthType, name="integration_auth_type", values_callable=lambda e: [item.value for item in e]),
        nullable=False,
    )
    capabilities: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    supports_webhooks: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    supports_scheduled_sync: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    supports_push: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    supports_pull: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    supports_manual_import: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class IntegrationConnection(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "integration_connections"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    provider_key: Mapped[str] = mapped_column(String(80), ForeignKey("integration_providers.key"), nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[IntegrationConnectionStatus] = mapped_column(
        Enum(IntegrationConnectionStatus, name="integration_connection_status", values_callable=lambda e: [item.value for item in e]),
        nullable=False,
        default=IntegrationConnectionStatus.CONNECTING,
    )
    connection_mode: Mapped[str] = mapped_column(String(40), nullable=False, default="manual")
    external_account_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    last_sync_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    last_success_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    last_error_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    last_error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    config_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class IntegrationCredential(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "integration_credentials"

    connection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_connections.id"), nullable=False, index=True)
    credential_type: Mapped[str] = mapped_column(String(60), nullable=False)
    secret_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    rotated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status: Mapped[IntegrationCredentialStatus] = mapped_column(
        Enum(IntegrationCredentialStatus, name="integration_credential_status", values_callable=lambda e: [item.value for item in e]),
        nullable=False,
        default=IntegrationCredentialStatus.ACTIVE,
    )


class IntegrationSyncRun(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "integration_sync_runs"

    connection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_connections.id"), nullable=False, index=True)
    provider_key: Mapped[str] = mapped_column(String(80), nullable=False)
    sync_type: Mapped[IntegrationSyncType] = mapped_column(
        Enum(IntegrationSyncType, name="integration_sync_type", values_callable=lambda e: [item.value for item in e]),
        nullable=False,
    )
    direction: Mapped[IntegrationSyncDirection] = mapped_column(
        Enum(IntegrationSyncDirection, name="integration_sync_direction", values_callable=lambda e: [item.value for item in e]),
        nullable=False,
    )
    status: Mapped[IntegrationSyncStatus] = mapped_column(
        Enum(IntegrationSyncStatus, name="integration_sync_status", values_callable=lambda e: [item.value for item in e]),
        nullable=False,
        default=IntegrationSyncStatus.PENDING,
    )
    triggered_by: Mapped[str] = mapped_column(String(60), nullable=False, default="manual")
    started_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    completed_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    records_seen: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_created: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_updated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_skipped: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cursor_before: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cursor_after: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)


class IntegrationSyncCursor(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "integration_sync_cursors"
    __table_args__ = (UniqueConstraint("connection_id", "stream_key", name="uq_integration_sync_cursor"),)

    connection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_connections.id"), nullable=False, index=True)
    stream_key: Mapped[str] = mapped_column(String(120), nullable=False)
    cursor_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_synced_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class IntegrationMapping(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "integration_mappings"
    __table_args__ = (UniqueConstraint("connection_id", "resource_type", "external_id", name="uq_integration_mapping_external"),)

    connection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_connections.id"), nullable=False, index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(120), nullable=False)
    internal_id: Mapped[str] = mapped_column(String(120), nullable=False)
    external_id: Mapped[str] = mapped_column(String(120), nullable=False)
    source_of_truth: Mapped[str] = mapped_column(String(40), nullable=False, default="internal")
    last_external_hash: Mapped[str | None] = mapped_column(String(120), nullable=True)
    conflict_state: Mapped[str | None] = mapped_column(String(40), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class IntegrationWebhookEvent(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "integration_webhook_events"
    __table_args__ = (UniqueConstraint("provider_key", "event_id", name="uq_integration_webhook_event"),)

    organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    connection_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_connections.id"), nullable=True, index=True)
    provider_key: Mapped[str] = mapped_column(String(80), nullable=False)
    event_id: Mapped[str] = mapped_column(String(120), nullable=False)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    signature_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    normalized_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="received")
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
