from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    IntegrationConnection,
    IntegrationCredential,
    IntegrationMapping,
    IntegrationProvider,
    IntegrationSyncCursor,
    IntegrationSyncRun,
    IntegrationWebhookEvent,
)


class IntegrationsRepository:
    def __init__(self, db: Session):
        self.db = db

    def upsert_provider(self, key: str, defaults: dict):
        row = self.db.get(IntegrationProvider, key)
        if row:
            for k, v in defaults.items():
                setattr(row, k, v)
            self.db.flush()
            return row
        row = IntegrationProvider(key=key, **defaults)
        self.db.add(row)
        self.db.flush()
        return row

    def list_providers(self, *, include_internal=False):
        query = select(IntegrationProvider)
        if not include_internal:
            query = query.where(IntegrationProvider.is_internal.is_(False))
        return list(self.db.scalars(query.order_by(IntegrationProvider.category, IntegrationProvider.name)).all())

    def get_provider(self, provider_key: str):
        return self.db.get(IntegrationProvider, provider_key)

    def create_connection(self, **kwargs):
        row = IntegrationConnection(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def list_connections(self, organization_id: str):
        return list(
            self.db.scalars(
                select(IntegrationConnection).where(
                    IntegrationConnection.organization_id == organization_id,
                    IntegrationConnection.deleted_at.is_(None),
                )
            ).all()
        )

    def get_connection(self, organization_id: str, connection_id: str):
        return self.db.scalar(
            select(IntegrationConnection).where(
                IntegrationConnection.organization_id == organization_id,
                IntegrationConnection.id == connection_id,
                IntegrationConnection.deleted_at.is_(None),
            )
        )

    def create_credential(self, **kwargs):
        row = IntegrationCredential(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def create_sync_run(self, **kwargs):
        row = IntegrationSyncRun(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def list_sync_runs(self, connection_id: str):
        return list(
            self.db.scalars(
                select(IntegrationSyncRun).where(
                    IntegrationSyncRun.connection_id == connection_id,
                    IntegrationSyncRun.deleted_at.is_(None),
                ).order_by(IntegrationSyncRun.created_at.desc())
            ).all()
        )

    def upsert_cursor(self, connection_id: str, stream_key: str, cursor_value: str | None, last_synced_at: str | None):
        row = self.db.scalar(
            select(IntegrationSyncCursor).where(IntegrationSyncCursor.connection_id == connection_id, IntegrationSyncCursor.stream_key == stream_key)
        )
        if row:
            row.cursor_value = cursor_value
            row.last_synced_at = last_synced_at
            self.db.flush()
            return row
        row = IntegrationSyncCursor(connection_id=connection_id, stream_key=stream_key, cursor_value=cursor_value, last_synced_at=last_synced_at)
        self.db.add(row)
        self.db.flush()
        return row

    def create_mapping(self, **kwargs):
        row = IntegrationMapping(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_mapping_by_external(self, connection_id: str, resource_type: str, external_id: str):
        return self.db.scalar(
            select(IntegrationMapping).where(
                IntegrationMapping.connection_id == connection_id,
                IntegrationMapping.resource_type == resource_type,
                IntegrationMapping.external_id == external_id,
                IntegrationMapping.deleted_at.is_(None),
            )
        )

    def get_webhook_event(self, provider_key: str, event_id: str):
        return self.db.scalar(select(IntegrationWebhookEvent).where(IntegrationWebhookEvent.provider_key == provider_key, IntegrationWebhookEvent.event_id == event_id))

    def create_webhook_event(self, **kwargs):
        row = IntegrationWebhookEvent(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row
