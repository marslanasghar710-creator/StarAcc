from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.schemas.integrations import (
    CreateIntegrationConnectionRequest,
    DisconnectResponse,
    IngestWebhookRequest,
    IntegrationConnectionResponse,
    IntegrationProviderResponse,
    IntegrationSyncRunResponse,
    TriggerSyncRequest,
    WebhookEventResponse,
)
from app.services.integrations_service import IntegrationsService

router = APIRouter(tags=["integrations"])


@router.get("/organizations/{organization_id}/integrations/providers", response_model=list[IntegrationProviderResponse])
def list_providers(organization_id: str, _=Depends(require_permission("settings.read")), db: Session = Depends(get_db)):
    rows = IntegrationsService(db).list_providers(organization_id=organization_id)
    return [
        IntegrationProviderResponse(
            key=row["provider"].key,
            name=row["provider"].name,
            category=row["provider"].category,
            status=row["provider"].status,
            auth_type=row["provider"].auth_type.value,
            capabilities=row["provider"].capabilities,
            supports_webhooks=row["provider"].supports_webhooks,
            supports_scheduled_sync=row["provider"].supports_scheduled_sync,
            supports_push=row["provider"].supports_push,
            supports_pull=row["provider"].supports_pull,
            supports_manual_import=row["provider"].supports_manual_import,
            is_public=row["provider"].is_public,
            is_internal=row["provider"].is_internal,
            required_feature=row["required_feature"],
            is_entitled=row["is_entitled"],
        )
        for row in rows
    ]


@router.get("/organizations/{organization_id}/integrations/connections", response_model=list[IntegrationConnectionResponse])
def list_connections(organization_id: str, _=Depends(require_permission("settings.read")), db: Session = Depends(get_db)):
    rows = IntegrationsService(db).list_connections(organization_id)
    return [
        IntegrationConnectionResponse(
            id=str(row.id),
            provider_key=row.provider_key,
            display_name=row.display_name,
            status=row.status,
            connection_mode=row.connection_mode,
            external_account_id=row.external_account_id,
            last_sync_at=row.last_sync_at,
            last_success_at=row.last_success_at,
            last_error_at=row.last_error_at,
            last_error_code=row.last_error_code,
            last_error_message=row.last_error_message,
            config_json=row.config_json,
            metadata_json=row.metadata_json,
        )
        for row in rows
    ]


@router.post("/organizations/{organization_id}/integrations/connections", response_model=IntegrationConnectionResponse)
def create_connection(organization_id: str, payload: CreateIntegrationConnectionRequest, current_user=Depends(get_current_user), _=Depends(require_permission("settings.update")), db: Session = Depends(get_db)):
    row = IntegrationsService(db).create_connection(
        organization_id,
        provider_key=payload.provider_key,
        display_name=payload.display_name,
        created_by_user_id=current_user.id,
        connection_mode=payload.connection_mode,
        config=payload.config,
        secret_ref=payload.secret_ref,
    )
    return IntegrationConnectionResponse(
        id=str(row.id),
        provider_key=row.provider_key,
        display_name=row.display_name,
        status=row.status,
        connection_mode=row.connection_mode,
        external_account_id=row.external_account_id,
        last_sync_at=row.last_sync_at,
        last_success_at=row.last_success_at,
        last_error_at=row.last_error_at,
        last_error_code=row.last_error_code,
        last_error_message=row.last_error_message,
        config_json=row.config_json,
        metadata_json=row.metadata_json,
    )


@router.delete("/organizations/{organization_id}/integrations/connections/{connection_id}", response_model=DisconnectResponse)
def disconnect_connection(organization_id: str, connection_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("settings.update")), db: Session = Depends(get_db)):
    return IntegrationsService(db).disconnect_connection(organization_id, connection_id=connection_id, actor_user_id=current_user.id)


@router.post("/organizations/{organization_id}/integrations/connections/{connection_id}/sync", response_model=IntegrationSyncRunResponse)
def trigger_sync(organization_id: str, connection_id: str, payload: TriggerSyncRequest, current_user=Depends(get_current_user), _=Depends(require_permission("settings.update")), db: Session = Depends(get_db)):
    row = IntegrationsService(db).trigger_sync(organization_id, connection_id=connection_id, actor_user_id=current_user.id, direction=payload.direction)
    return IntegrationSyncRunResponse(
        id=str(row.id),
        provider_key=row.provider_key,
        sync_type=row.sync_type.value,
        direction=row.direction,
        status=row.status,
        triggered_by=row.triggered_by,
        started_at=row.started_at,
        completed_at=row.completed_at,
        records_seen=row.records_seen,
        records_created=row.records_created,
        records_updated=row.records_updated,
        records_skipped=row.records_skipped,
        records_failed=row.records_failed,
        cursor_before=row.cursor_before,
        cursor_after=row.cursor_after,
        error_summary=row.error_summary,
    )


@router.get("/organizations/{organization_id}/integrations/connections/{connection_id}/sync-runs", response_model=list[IntegrationSyncRunResponse])
def list_sync_runs(organization_id: str, connection_id: str, _=Depends(require_permission("settings.read")), db: Session = Depends(get_db)):
    rows = IntegrationsService(db).list_sync_runs(organization_id, connection_id)
    return [
        IntegrationSyncRunResponse(
            id=str(row.id),
            provider_key=row.provider_key,
            sync_type=row.sync_type.value,
            direction=row.direction,
            status=row.status,
            triggered_by=row.triggered_by,
            started_at=row.started_at,
            completed_at=row.completed_at,
            records_seen=row.records_seen,
            records_created=row.records_created,
            records_updated=row.records_updated,
            records_skipped=row.records_skipped,
            records_failed=row.records_failed,
            cursor_before=row.cursor_before,
            cursor_after=row.cursor_after,
            error_summary=row.error_summary,
        )
        for row in rows
    ]


@router.post("/integrations/webhooks/ingest", response_model=WebhookEventResponse)
def ingest_webhook(payload: IngestWebhookRequest, db: Session = Depends(get_db)):
    event, deduped = IntegrationsService(db).ingest_webhook_event(
        provider_key=payload.provider_key,
        event_id=payload.event_id,
        event_type=payload.event_type,
        payload=payload.payload,
        signature_valid=payload.signature_valid,
        organization_id=payload.organization_id,
        connection_id=payload.connection_id,
    )
    return WebhookEventResponse(
        id=str(event.id),
        provider_key=event.provider_key,
        event_id=event.event_id,
        event_type=event.event_type,
        signature_valid=event.signature_valid,
        status=event.status,
        error_message=event.error_message,
        deduped=deduped,
    )
