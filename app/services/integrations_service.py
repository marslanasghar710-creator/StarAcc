from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from decimal import Decimal

UTC = timezone.utc

from app.core.enums import (
    BankTransactionStatus,
    BankTransactionType,
    IntegrationConnectionStatus,
    IntegrationCredentialStatus,
    IntegrationSyncDirection,
    IntegrationSyncStatus,
    IntegrationSyncType,
)
from app.core.exceptions import bad_request, not_found
from app.integrations.provider_registry import INTEGRATION_PROVIDER_REGISTRY
from app.repositories.audit import AuditRepository
from app.repositories.bank_account_repository import BankAccountRepository
from app.repositories.bank_transaction_repository import BankTransactionRepository
from app.repositories.integrations_repository import IntegrationsRepository
from app.services.billing_service import BillingService
from app.services.entitlements_service import EntitlementsService


class IntegrationsService:
    def __init__(self, db):
        self.db = db
        self.repo = IntegrationsRepository(db)
        self.bank_accounts = BankAccountRepository(db)
        self.bank_transactions = BankTransactionRepository(db)
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

    def start_connection(self, organization_id: str, provider_id: str):
        provider = self.repo.get_provider(provider_id)
        if not provider:
            raise not_found("Provider not found")
        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=None,
            action="integration.connection.started",
            entity_type="integration_provider",
            entity_id=provider_id,
            metadata_json={"provider_id": provider_id},
        )
        self.db.commit()
        return {"provider_id": provider_id, "connection_context": {"authorization_url": f"https://connect.staracc.local/{provider_id}", "state": hashlib.sha256(f"{organization_id}:{provider_id}".encode()).hexdigest()[:24]}}

    def complete_connection(self, organization_id: str, *, provider_id: str, display_name: str, auth_payload: dict, created_by_user_id):
        EntitlementsService(self.db).enforce_limit(organization_id, "max_integrations")
        provider = self.repo.get_provider(provider_id)
        if not provider:
            raise not_found("Provider not found")

        required_feature = INTEGRATION_PROVIDER_REGISTRY[provider.key].required_feature
        if required_feature:
            EntitlementsService(self.db).enforce_feature(organization_id, "integrations")
            BillingService(self.db).ensure_feature(organization_id, required_feature)

        connection = self.repo.create_connection(
            organization_id=organization_id,
            provider_key=provider_id,
            display_name=display_name,
            status=IntegrationConnectionStatus.CONNECTED,
            connection_mode="feed",
            created_by_user_id=created_by_user_id,
            config_json={"auth_payload": auth_payload},
            metadata_json={"required_feature": required_feature},
        )

        self.repo.create_credential(
            connection_id=connection.id,
            credential_type=provider.auth_type.value,
            secret_ref=f"{provider_id}:{connection.id}",
            status=IntegrationCredentialStatus.ACTIVE,
            rotated_at=datetime.now(UTC).isoformat(),
        )

        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=created_by_user_id,
            action="integration.connection.completed",
            entity_type="integration_connection",
            entity_id=str(connection.id),
            metadata_json={"provider_id": provider_id},
        )
        self.db.commit()
        self.db.refresh(connection)
        return connection

    def create_connection(self, organization_id: str, *, provider_key: str, display_name: str, created_by_user_id, connection_mode: str, config: dict | None = None, secret_ref: str | None = None):
        provider = self.repo.get_provider(provider_key)
        EntitlementsService(self.db).enforce_limit(organization_id, "max_integrations")
        if not provider:
            raise not_found("Provider not found")
        EntitlementsService(self.db).enforce_limit(organization_id, "max_integrations")

        required_feature = INTEGRATION_PROVIDER_REGISTRY[provider.key].required_feature
        if required_feature:
            EntitlementsService(self.db).enforce_feature(organization_id, "integrations")
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
            action="integration.connection.completed",
            entity_type="integration_connection",
            entity_id=str(connection.id),
            metadata_json={"provider_key": provider_key, "display_name": display_name},
        )
        self.db.commit()
        self.db.refresh(connection)
        return connection

    def list_source_accounts(self, organization_id: str, connection_id: str):
        connection = self.repo.get_connection(organization_id, connection_id)
        if not connection:
            raise not_found("Connection not found")
        # Provider-agnostic adapter shape (sandbox implementation)
        return [
            {"external_account_id": f"{connection.provider_key}-chk-001", "label": "Checking • 001", "currency": "USD", "account_type": "checking"},
            {"external_account_id": f"{connection.provider_key}-sav-001", "label": "Savings • 001", "currency": "USD", "account_type": "savings"},
        ]

    def map_external_account(self, organization_id: str, connection_id: str, *, external_account_id: str, bank_account_id: str, actor_user_id):
        connection = self.repo.get_connection(organization_id, connection_id)
        if not connection:
            raise not_found("Connection not found")
        bank_account = self.bank_accounts.get(organization_id, bank_account_id)
        if not bank_account:
            raise not_found("Bank account not found")

        mapping = self.repo.get_mapping_by_external(connection_id, "bank_account", external_account_id)
        if not mapping:
            mapping = self.repo.create_mapping(
                connection_id=connection.id,
                organization_id=organization_id,
                resource_type="bank_account",
                internal_id=str(bank_account_id),
                external_id=external_account_id,
                source_of_truth="internal",
                metadata_json={"mapped_at": datetime.now(UTC).isoformat()},
            )
        else:
            mapping.internal_id = str(bank_account_id)
            mapping.metadata_json = {**(mapping.metadata_json or {}), "remapped_at": datetime.now(UTC).isoformat()}

        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="integration.account_mapped",
            entity_type="integration_mapping",
            entity_id=str(mapping.id),
            metadata_json={"connection_id": str(connection_id), "external_account_id": external_account_id, "bank_account_id": str(bank_account_id)},
        )
        self.db.commit()
        self.db.refresh(mapping)
        return mapping

    def _dedupe_hash(self, organization_id: str, bank_account_id: str, transaction_date: str, amount: Decimal, description: str, reference: str | None):
        normalized = "|".join([
            str(organization_id),
            str(bank_account_id),
            str(transaction_date),
            f"{amount:.2f}",
            (description or "").strip().lower(),
            (reference or "").strip().lower(),
        ])
        return hashlib.sha256(normalized.encode()).hexdigest()

    def import_bank_statement(self, organization_id: str, *, bank_account_id: str, source_filename: str, rows: list[dict], actor_user_id):
        bank_account = self.bank_accounts.get(organization_id, bank_account_id)
        if not bank_account:
            raise not_found("Bank account not found")

        connections = self.repo.list_connections(organization_id)
        manual_connection = connections[0] if connections else self.repo.create_connection(
            organization_id=organization_id,
            provider_key="bank_feed_sandbox",
            display_name="Manual Import Pipeline",
            status=IntegrationConnectionStatus.CONNECTED,
            connection_mode="manual_import",
            created_by_user_id=actor_user_id,
            config_json={},
            metadata_json={"auto_created": True},
        )

        job = self.repo.create_sync_run(
            connection_id=manual_connection.id,
            provider_key="manual_import",
            sync_type=IntegrationSyncType.MANUAL,
            direction=IntegrationSyncDirection.PULL,
            status=IntegrationSyncStatus.RUNNING,
            triggered_by="manual_import",
            started_at=datetime.now(UTC).isoformat(),
            cursor_before=None,
        )

        imported = 0
        duplicates = 0
        failed = 0

        existing_rows = self.bank_transactions.list_transactions(organization_id, bank_account_id, limit=10000, offset=0)
        existing_hashes = {
            (item.reference or "")
            for item in existing_rows
            if item.source_module == "integrations" and item.source_type in {"manual_import", "bank_feed"} and item.reference and item.reference.startswith("dup:")
        }

        for row in rows:
            try:
                amount = Decimal(str(row["amount"]))
                tx_type = BankTransactionType.MONEY_IN if amount > 0 else BankTransactionType.MONEY_OUT
                dedupe = self._dedupe_hash(organization_id, bank_account_id, row["transaction_date"], amount, row["description"], row.get("reference"))
                marker = f"dup:{dedupe}"
                if marker in existing_hashes:
                    duplicates += 1
                    continue
                self.bank_transactions.create(
                    organization_id=organization_id,
                    bank_account_id=bank_account_id,
                    transaction_date=row["transaction_date"],
                    posted_date=row["transaction_date"],
                    transaction_type=tx_type,
                    amount=amount,
                    description=row["description"],
                    reference=marker,
                    memo=f"Imported from {source_filename}",
                    status=BankTransactionStatus.UNRECONCILED,
                    source_module="integrations",
                    source_type="manual_import",
                    source_id=dedupe,
                    created_by_user_id=actor_user_id,
                )
                existing_hashes.add(marker)
                imported += 1
            except Exception:
                failed += 1

        job.status = IntegrationSyncStatus.SUCCEEDED if failed == 0 else IntegrationSyncStatus.PARTIAL
        job.completed_at = datetime.now(UTC).isoformat()
        job.records_seen = len(rows)
        job.records_created = imported
        job.records_skipped = duplicates
        job.records_failed = failed
        job.error_summary = None if failed == 0 else "Some statement rows failed normalization"

        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="integration.manual_import.completed",
            entity_type="integration_sync_run",
            entity_id=str(job.id),
            metadata_json={"source_filename": source_filename, "imported_count": imported, "duplicate_count": duplicates, "failed_count": failed},
        )
        self.db.commit()
        return {"imported_count": imported, "duplicate_count": duplicates, "failed_count": failed, "skipped_count": duplicates, "job_id": str(job.id)}

    def disconnect_connection(self, organization_id: str, *, connection_id: str, actor_user_id):
        connection = self.repo.get_connection(organization_id, connection_id)
        if not connection:
            raise not_found("Connection not found")
        connection.status = IntegrationConnectionStatus.DISCONNECTED
        connection.deleted_at = datetime.now(UTC)
        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="integration.disconnected",
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

        mapping = self.repo.get_mapping_by_external(connection_id, "bank_account", connection.external_account_id or f"{connection.provider_key}-chk-001")
        if not mapping:
            raise bad_request("Mapping required before import can continue")

        run = self.repo.create_sync_run(
            connection_id=connection.id,
            provider_key=connection.provider_key,
            sync_type=IntegrationSyncType.MANUAL,
            direction=direction,
            status=IntegrationSyncStatus.RUNNING,
            triggered_by="manual",
            started_at=datetime.now(UTC).isoformat(),
        )

        # Sandbox feed transaction batch (idempotent via dedupe marker)
        rows = [
            {"transaction_date": date_iso, "description": f"{connection.display_name} feed txn {idx+1}", "amount": float((-1) ** idx * (20 + idx * 3)), "reference": f"feed-{connection.id}-{idx}"}
            for idx, date_iso in enumerate([datetime.now(UTC).date().isoformat()] * 5)
        ]
        summary = self.import_bank_statement(
            organization_id,
            bank_account_id=mapping.internal_id,
            source_filename=f"sync-{connection.provider_key}.json",
            rows=rows,
            actor_user_id=actor_user_id,
        )

        run.status = IntegrationSyncStatus.SUCCEEDED if summary["failed_count"] == 0 else IntegrationSyncStatus.PARTIAL
        run.records_seen = len(rows)
        run.records_created = summary["imported_count"]
        run.records_skipped = summary["duplicate_count"]
        run.records_failed = summary["failed_count"]
        run.completed_at = datetime.now(UTC).isoformat()
        run.cursor_after = f"{connection.provider_key}:{int(datetime.now(UTC).timestamp())}"

        connection.status = IntegrationConnectionStatus.HEALTHY
        connection.last_sync_at = run.completed_at
        connection.last_success_at = run.completed_at if run.status == IntegrationSyncStatus.SUCCEEDED else connection.last_success_at

        self.repo.upsert_cursor(connection.id, "default", run.cursor_after, run.completed_at)

        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action="integration.sync.completed" if run.status == IntegrationSyncStatus.SUCCEEDED else "integration.sync.failed",
            entity_type="integration_sync_run",
            entity_id=str(run.id),
            metadata_json=summary,
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
