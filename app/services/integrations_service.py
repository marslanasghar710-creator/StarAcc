from datetime import datetime, timezone

UTC = timezone.utc

from app.core.enums import IntegrationConnectionStatus, IntegrationCredentialStatus, IntegrationSyncDirection, IntegrationSyncStatus, IntegrationSyncType
from app.core.exceptions import bad_request, not_found
from app.integrations.provider_registry import INTEGRATION_PROVIDER_REGISTRY
from app.repositories.audit import AuditRepository
from app.repositories.integrations_repository import IntegrationsRepository
from app.services.billing_service import BillingService


class IntegrationsService:
    def __init__(self, db):
        self.db = db
        self.repo = IntegrationsRepository(db)
        self._sync_provider_registry()

    def _sync_provider_registry(self):
        for definition in INTEGRATION_PROVIDER_REGISTRY.values():
            self.repo.upsert_provider(
                definition.key,
                {
                    "name": definition.name,
                    "category": definition.category,
                    "status": "available",
                    "auth_type": definition.auth_type,
                    "capabilities": definition.capabilities,
                    "supports_webhooks": definition.supports_webhooks,
                    "supports_scheduled_sync": definition.supports_scheduled_sync,
                    "supports_push": definition.supports_push,
                    "supports_pull": definition.supports_pull,
                    "supports_manual_import": definition.supports_manual_import,
                    "is_public": definition.is_public,
                    "is_internal": definition.is_internal,
                },
            )
        self.db.flush()

    def list_providers(self, *, organization_id: str, include_internal=False):
        state = BillingService(self.db).get_commercial_state(organization_id)
        providers = self.repo.list_providers(include_internal=include_internal)
        payload = []
        for provider in providers:
            required_feature = INTEGRATION_PROVIDER_REGISTRY[provider.key].required_feature
            is_entitled = True if not required_feature else bool(state["features"].get(required_feature, False))
            payload.append({"provider": provider, "required_feature": required_feature, "is_entitled": is_entitled})
        return payload

    def list_connections(self, organization_id: str):
        return self.repo.list_connections(organization_id)

    def create_connection(self, organization_id: str, *, provider_key: str, display_name: str, created_by_user_id, connection_mode: str, config: dict | None = None, secret_ref: str | None = None):
        provider = self.repo.get_provider(provider_key)
        if not provider:
            raise not_found("Provider not found")

        required_feature = INTEGRATION_PROVIDER_REGISTRY[provider.key].required_feature
        if required_feature:
            BillingService(self.db).ensure_feature(organization_id, required_feature)

        connection = self.repo.create_connection(
            organization_id=organization_id,
            provider_key=provider_key,
            display_name=display_name,
            status=IntegrationConnectionStatus.CONNECTED,
            connection_mode=connection_mode,
            created_by_user_id=created_by_user_id,
            config_json=config or {},
            metadata_json={"required_feature": required_feature},
        )

        if secret_ref:
            self.repo.create_credential(
                connection_id=connection.id,
                credential_type=provider.auth_type.value,
                secret_ref=secret_ref,
                status=IntegrationCredentialStatus.ACTIVE,
                rotated_at=datetime.now(UTC).isoformat(),
            )

        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=created_by_user_id,
            action="integrations.connection.created",
            entity_type="integration_connection",
            entity_id=str(connection.id),
            metadata_json={"provider_key": provider_key, "display_name": display_name},
        )
        self.db.commit()
        self.db.refresh(connection)
        return connection

    def disconnect_connection(self, organization_id: str, *, connection_id: str, actor_user_id):
        connection = self.repo.get_connection(organization_id, connection_id)
        if not connection:
            raise not_found("Connection not found")
        connection.status = IntegrationConnectionStatus.DISCONNECTED
        connection.deleted_at = datetime.now(UTC)
        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="integrations.connection.disconnected",
            entity_type="integration_connection",
            entity_id=str(connection.id),
            metadata_json={"provider_key": connection.provider_key},
        )
        self.db.commit()
        return {"message": "disconnected"}

    def trigger_sync(self, organization_id: str, *, connection_id: str, actor_user_id, direction: IntegrationSyncDirection = IntegrationSyncDirection.PULL):
        connection = self.repo.get_connection(organization_id, connection_id)
        if not connection:
            raise not_found("Connection not found")
        if connection.status in {IntegrationConnectionStatus.DISCONNECTED, IntegrationConnectionStatus.ARCHIVED}:
            raise bad_request("Connection is not active")

        provider_definition = INTEGRATION_PROVIDER_REGISTRY.get(connection.provider_key)
        if not provider_definition:
            raise not_found("Provider definition not registered")
        if direction == IntegrationSyncDirection.PULL and not provider_definition.supports_pull:
            raise bad_request("Provider does not support pull sync")
        if direction == IntegrationSyncDirection.PUSH and not provider_definition.supports_push:
            raise bad_request("Provider does not support push sync")

        now = datetime.now(UTC).isoformat()
        run = self.repo.create_sync_run(
            connection_id=connection.id,
            provider_key=connection.provider_key,
            sync_type=IntegrationSyncType.MANUAL,
            direction=direction,
            status=IntegrationSyncStatus.RUNNING,
            triggered_by="manual",
            started_at=now,
        )

        # Simulated adapter execution with deterministic idempotent behavior.
        records_seen = 5
        records_created = 2
        records_updated = 1
        records_skipped = 2
        cursor_after = f"{connection.provider_key}:{int(datetime.now(UTC).timestamp())}"

        run.status = IntegrationSyncStatus.SUCCEEDED
        run.records_seen = records_seen
        run.records_created = records_created
        run.records_updated = records_updated
        run.records_skipped = records_skipped
        run.records_failed = 0
        run.completed_at = datetime.now(UTC).isoformat()
        run.cursor_after = cursor_after

        connection.status = IntegrationConnectionStatus.HEALTHY
        connection.last_sync_at = run.completed_at
        connection.last_success_at = run.completed_at
        connection.last_error_at = None
        connection.last_error_code = None
        connection.last_error_message = None

        self.repo.upsert_cursor(connection.id, "default", cursor_after, run.completed_at)

        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="integrations.sync.completed",
            entity_type="integration_sync_run",
            entity_id=str(run.id),
            metadata_json={
                "provider_key": connection.provider_key,
                "records_seen": records_seen,
                "records_created": records_created,
                "records_updated": records_updated,
                "records_skipped": records_skipped,
            },
        )

        self.db.commit()
        self.db.refresh(run)
        return run

    def list_sync_runs(self, organization_id: str, connection_id: str):
        connection = self.repo.get_connection(organization_id, connection_id)
        if not connection:
            raise not_found("Connection not found")
        return self.repo.list_sync_runs(connection.id)

    def ingest_webhook_event(self, provider_key: str, event_id: str, event_type: str, payload: dict, signature_valid: bool, organization_id: str | None = None, connection_id: str | None = None):
        existing = self.repo.get_webhook_event(provider_key, event_id)
        if existing:
            return existing, True

        event = self.repo.create_webhook_event(
            provider_key=provider_key,
            event_id=event_id,
            event_type=event_type,
            payload_json=payload,
            normalized_json={"event_type": event_type, "received_at": datetime.now(UTC).isoformat()},
            signature_valid=signature_valid,
            organization_id=organization_id,
            connection_id=connection_id,
            status="received" if signature_valid else "invalid_signature",
            error_message=None if signature_valid else "Signature validation failed",
        )

        if organization_id:
            AuditRepository(self.db).create(
                organization_id=organization_id,
                actor_user_id=None,
                action="integrations.webhook.received",
                entity_type="integration_webhook_event",
                entity_id=str(event.id),
                metadata_json={"provider_key": provider_key, "event_type": event_type, "signature_valid": signature_valid},
            )

        self.db.commit()
        self.db.refresh(event)
        return event, False
