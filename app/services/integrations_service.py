from __future__ import annotations

import csv
import hashlib
import io
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation

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
from app.schemas.observability import ErrorRecord, PerformanceMetric, QueryPerformanceRecord
from app.services.billing_service import BillingService
from app.services.entitlements_service import EntitlementsService
from app.services.observability_service import ErrorTrackingService, PerformanceMetricsService, QueryObservabilityService


class IntegrationsService:
    def __init__(self, db):
        self.db = db
        self.repo = IntegrationsRepository(db)
        self.bank_accounts = BankAccountRepository(db)
        self.bank_transactions = BankTransactionRepository(db)
        self._sync_provider_registry()

    def _record_metric(self, organization_id: str, operation: str, duration_ms: float, status: str, metadata: dict | None = None):
        PerformanceMetricsService(self.db).record(PerformanceMetric(
            metric_id=hashlib.sha256(f"{organization_id}:{operation}:{datetime.now(timezone.utc).timestamp()}".encode()).hexdigest()[:24],
            recorded_at=datetime.now(timezone.utc).isoformat(),
            domain="integrations",
            operation=operation,
            duration_ms=duration_ms,
            status=status,
            org_id=organization_id,
            metadata=metadata or {},
        ))

    def _record_error(self, organization_id: str, operation: str, error_code: str, message: str, severity: str = "medium", retryable: bool = False, metadata: dict | None = None):
        ErrorTrackingService(self.db).record(ErrorRecord(
            error_id=hashlib.sha256(f"{organization_id}:{operation}:{error_code}:{datetime.now(timezone.utc).timestamp()}".encode()).hexdigest()[:24],
            occurred_at=datetime.now(timezone.utc).isoformat(),
            domain="integrations",
            error_class="external_dependency" if "provider" in error_code else "job_failure",
            error_code=error_code,
            severity=severity,
            message=message,
            org_id=organization_id,
            operation=operation,
            retryable=retryable,
            metadata=metadata or {},
        ))

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
            definition = INTEGRATION_PROVIDER_REGISTRY[provider.key]
            required_feature = definition.required_feature
            is_entitled = True if not required_feature else bool(state["features"].get(required_feature, False))
            payload.append({
                "provider": provider,
                "required_feature": required_feature,
                "is_entitled": is_entitled,
            })
        return payload

    def list_connections(self, organization_id: str):
        started = datetime.now(timezone.utc)
        rows = self.repo.list_connections(organization_id)
        duration_ms = (datetime.now(timezone.utc) - started).total_seconds() * 1000
        QueryObservabilityService(self.db).record(QueryPerformanceRecord(recorded_at=datetime.now(timezone.utc).isoformat(), query_name="integrations.list_connections", domain="integrations", duration_ms=duration_ms, status="success", row_count=len(rows), org_id=organization_id))
        return rows

    def start_connection(self, organization_id: str, provider_id: str):
        provider = self.repo.get_provider(provider_id)
        if not provider:
            raise not_found("Provider not found")

        required_feature = INTEGRATION_PROVIDER_REGISTRY[provider.key].required_feature
        if required_feature:
            EntitlementsService(self.db).enforce_feature(organization_id, "integrations")
            BillingService(self.db).ensure_feature(organization_id, required_feature)

        AuditRepository(self.db).create(
            organization_id=organization_id,
            actor_user_id=None,
            action="integration.connection.started",
            entity_type="integration_provider",
            entity_id=provider_id,
            metadata_json={"provider_id": provider_id},
        )
        self.db.commit()
        return {
            "provider_id": provider_id,
            "connection_context": {
                "authorization_url": f"https://connect.staracc.local/{provider_id}",
                "state": hashlib.sha256(f"{organization_id}:{provider_id}".encode()).hexdigest()[:24],
            },
        }

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
            rotated_at=datetime.now(timezone.utc).isoformat(),
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
                rotated_at=datetime.now(timezone.utc).isoformat(),
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
                metadata_json={"mapped_at": datetime.now(timezone.utc).isoformat()},
            )
        else:
            mapping.internal_id = str(bank_account_id)
            mapping.metadata_json = {**(mapping.metadata_json or {}), "remapped_at": datetime.now(timezone.utc).isoformat()}

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
            f"{amount.quantize(Decimal('0.01'))}",
            (description or "").strip().lower(),
            (reference or "").strip().lower(),
        ])
        return hashlib.sha256(normalized.encode()).hexdigest()

    @staticmethod
    def _parse_date(value: str) -> str:
        text = (value or "").strip()
        if not text:
            raise ValueError("transaction_date is required")
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
            try:
                return datetime.strptime(text, fmt).date().isoformat()
            except ValueError:
                continue
        raise ValueError(f"invalid transaction_date '{value}'")

    @staticmethod
    def _parse_amount(value) -> Decimal:
        text = str(value).strip().replace(",", "")
        if not text:
            raise ValueError("amount is required")
        try:
            return Decimal(text).quantize(Decimal("0.01"))
        except (InvalidOperation, ValueError) as exc:
            raise ValueError(f"invalid amount '{value}'") from exc

    def _normalize_statement_rows(self, rows: list[dict], *, field_mapping: dict | None = None) -> tuple[list[dict], list[dict]]:
        mapping = {
            "transaction_date": "transaction_date",
            "description": "description",
            "amount": "amount",
            "reference": "reference",
        }
        if field_mapping:
            mapping.update({k: v for k, v in field_mapping.items() if v})

        normalized: list[dict] = []
        failures: list[dict] = []
        required_columns = {mapping["transaction_date"], mapping["description"], mapping["amount"]}

        for idx, row in enumerate(rows, start=1):
            missing = [col for col in required_columns if col not in row]
            if missing:
                failures.append({"row": idx, "error": f"missing required column(s): {', '.join(sorted(missing))}"})
                continue
            try:
                transaction_date = self._parse_date(str(row.get(mapping["transaction_date"], "")))
                description = str(row.get(mapping["description"], "")).strip()
                if not description:
                    raise ValueError("description is required")
                amount = self._parse_amount(row.get(mapping["amount"]))
                reference_raw = row.get(mapping["reference"]) if mapping.get("reference") else row.get("reference")
                reference = str(reference_raw).strip() if reference_raw is not None else None
                normalized.append({
                    "transaction_date": transaction_date,
                    "description": description,
                    "amount": amount,
                    "reference": reference or None,
                })
            except ValueError as exc:
                failures.append({"row": idx, "error": str(exc)})

        return normalized, failures

    def _rows_from_csv(self, csv_content: str, field_mapping: dict | None = None) -> tuple[list[dict], list[dict]]:
        reader = csv.DictReader(io.StringIO(csv_content))
        if not reader.fieldnames:
            raise bad_request("CSV header row is required")

        normalized_headers = [h.strip() for h in reader.fieldnames if h and h.strip()]
        if len(normalized_headers) != len(reader.fieldnames):
            raise bad_request("CSV contains empty header names")

        mapping = field_mapping or {}
        required_targets = [mapping.get("transaction_date", "transaction_date"), mapping.get("description", "description"), mapping.get("amount", "amount")]
        missing_headers = [column for column in required_targets if column not in normalized_headers]
        if missing_headers:
            raise bad_request(f"CSV missing required headers: {', '.join(sorted(missing_headers))}")

        return self._normalize_statement_rows(list(reader), field_mapping=mapping)

    def import_bank_statement(self, organization_id: str, *, bank_account_id: str, source_filename: str, rows: list[dict], actor_user_id, field_mapping: dict | None = None, connection_id: str | None = None, external_account_id: str | None = None, csv_content: str | None = None):
        bank_account = self.bank_accounts.get(organization_id, bank_account_id)
        if not bank_account:
            raise not_found("Bank account not found")

        EntitlementsService(self.db).enforce_feature(organization_id, "integrations")
        BillingService(self.db).ensure_feature(organization_id, "integrations_basic")

        manual_connection = self.repo.get_connection(organization_id, connection_id) if connection_id else None
        if not manual_connection:
            manual_connection = self.repo.create_connection(
                organization_id=organization_id,
                provider_key="bank_feed_sandbox",
                display_name="Manual Import Pipeline",
                status=IntegrationConnectionStatus.HEALTHY,
                connection_mode="manual_import",
                created_by_user_id=actor_user_id,
                config_json={},
                metadata_json={"auto_created": True},
            )

        source_external_account_id = external_account_id or f"{manual_connection.provider_key}-manual-default"
        mapping = self.repo.get_mapping_by_external(str(manual_connection.id), "bank_account", source_external_account_id)
        if not mapping:
            self.repo.create_mapping(
                connection_id=manual_connection.id,
                organization_id=organization_id,
                resource_type="bank_account",
                internal_id=str(bank_account_id),
                external_id=source_external_account_id,
                source_of_truth="internal",
                metadata_json={"mapped_at": datetime.now(timezone.utc).isoformat(), "source": "manual_import"},
            )

        run = self.repo.create_sync_run(
            connection_id=manual_connection.id,
            provider_key="manual_import",
            sync_type=IntegrationSyncType.MANUAL,
            direction=IntegrationSyncDirection.PULL,
            status=IntegrationSyncStatus.RUNNING,
            triggered_by="manual_import",
            started_at=datetime.now(timezone.utc).isoformat(),
            cursor_before=None,
        )

        try:
            normalized_rows, normalization_failures = self._rows_from_csv(csv_content, field_mapping) if csv_content else self._normalize_statement_rows(rows, field_mapping=field_mapping)
            imported = 0
            duplicates = 0
            failed = len(normalization_failures)

            existing_rows = self.bank_transactions.list(organization_id, bank_account_id)
            existing_hashes = {
                (item.reference or "")
                for item in existing_rows
                if item.source_module == "integrations" and item.source_type in {"manual_import", "bank_feed"} and item.reference and item.reference.startswith("dup:")
            }

            for row in normalized_rows:
                amount = row["amount"]
                tx_type = BankTransactionType.DEPOSIT if amount >= 0 else BankTransactionType.WITHDRAWAL
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

            run.status = IntegrationSyncStatus.SUCCEEDED if failed == 0 else IntegrationSyncStatus.PARTIAL
            run.completed_at = datetime.now(timezone.utc).isoformat()
            run.records_seen = len(normalized_rows) + len(normalization_failures)
            run.records_created = imported
            run.records_skipped = duplicates
            run.records_failed = failed
            run.error_summary = None if failed == 0 else "Some statement rows failed normalization"
            run.cursor_after = f"manual_import:{datetime.now(timezone.utc).date().isoformat()}"

            manual_connection.status = IntegrationConnectionStatus.HEALTHY if run.status == IntegrationSyncStatus.SUCCEEDED else IntegrationConnectionStatus.DEGRADED
            manual_connection.last_sync_at = run.completed_at
            manual_connection.last_success_at = run.completed_at if run.status == IntegrationSyncStatus.SUCCEEDED else manual_connection.last_success_at
            if failed > 0:
                manual_connection.last_error_at = run.completed_at
                manual_connection.last_error_code = "manual_import_validation"
                manual_connection.last_error_message = run.error_summary

            self.repo.upsert_cursor(manual_connection.id, "manual_import", run.cursor_after, run.completed_at)

            AuditRepository(self.db).create(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                action="integration.manual_import.completed",
                entity_type="integration_sync_run",
                entity_id=str(run.id),
                metadata_json={
                    "source_filename": source_filename,
                    "imported_count": imported,
                    "duplicate_count": duplicates,
                    "failed_count": failed,
                    "validation_errors": normalization_failures[:10],
                },
            )
            self.db.commit()
            self._record_metric(
                organization_id,
                "import_bank_statement",
                0 if run.records_seen == 0 else (run.records_seen * 1.0),
                "success" if failed == 0 else "partial",
                {"rows": run.records_seen, "failed": failed, "duplicates": duplicates},
            )
            return {
                "imported_count": imported,
                "duplicate_count": duplicates,
                "failed_count": failed,
                "skipped_count": duplicates,
                "job_id": str(run.id),
                "error_samples": normalization_failures[:5],
            }
        except Exception as exc:
            run.status = IntegrationSyncStatus.FAILED
            run.completed_at = datetime.now(timezone.utc).isoformat()
            run.error_summary = str(exc)
            run.records_failed = max(run.records_failed, 1)
            manual_connection.status = IntegrationConnectionStatus.FAILED
            manual_connection.last_error_at = run.completed_at
            manual_connection.last_error_code = "manual_import_failed"
            manual_connection.last_error_message = str(exc)
            self.db.commit()
            self._record_error(organization_id, "import_bank_statement", "manual_import_failed", str(exc), severity="high", retryable=True)
            raise

    def disconnect_connection(self, organization_id: str, *, connection_id: str, actor_user_id):
        connection = self.repo.get_connection(organization_id, connection_id)
        if not connection:
            raise not_found("Connection not found")
        connection.status = IntegrationConnectionStatus.DISCONNECTED
        connection.deleted_at = datetime.now(timezone.utc)
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

        run = self.repo.create_sync_run(
            connection_id=connection.id,
            provider_key=connection.provider_key,
            sync_type=IntegrationSyncType.MANUAL,
            direction=direction,
            status=IntegrationSyncStatus.RUNNING,
            triggered_by="manual",
            started_at=datetime.now(timezone.utc).isoformat(),
            cursor_before=None,
        )

        try:
            mapping = self.repo.get_mapping_by_external(str(connection_id), "bank_account", connection.external_account_id or f"{connection.provider_key}-chk-001")
            if not mapping:
                raise bad_request("Mapping required before import can continue")

            rows = [
                {
                    "transaction_date": datetime.now(timezone.utc).date().isoformat(),
                    "description": f"{connection.display_name} feed txn {idx + 1}",
                    "amount": Decimal((-1) ** idx * (20 + idx * 3)),
                    "reference": f"feed-{connection.id}-{idx}",
                }
                for idx in range(5)
            ]
            summary = self.import_bank_statement(
                organization_id,
                bank_account_id=mapping.internal_id,
                source_filename=f"sync-{connection.provider_key}.json",
                rows=rows,
                actor_user_id=actor_user_id,
                connection_id=str(connection.id),
                external_account_id=connection.external_account_id or f"{connection.provider_key}-chk-001",
            )

            run.status = IntegrationSyncStatus.SUCCEEDED if summary["failed_count"] == 0 else IntegrationSyncStatus.PARTIAL
            run.records_seen = len(rows)
            run.records_created = summary["imported_count"]
            run.records_skipped = summary["duplicate_count"]
            run.records_failed = summary["failed_count"]
            run.completed_at = datetime.now(timezone.utc).isoformat()
            run.cursor_after = f"{connection.provider_key}:{int(datetime.now(timezone.utc).timestamp())}"
            run.error_summary = None if run.status == IntegrationSyncStatus.SUCCEEDED else "Some records failed"

            connection.status = IntegrationConnectionStatus.HEALTHY if run.status == IntegrationSyncStatus.SUCCEEDED else IntegrationConnectionStatus.DEGRADED
            connection.last_sync_at = run.completed_at
            connection.last_success_at = run.completed_at if run.status == IntegrationSyncStatus.SUCCEEDED else connection.last_success_at
            if run.status != IntegrationSyncStatus.SUCCEEDED:
                connection.last_error_at = run.completed_at
                connection.last_error_code = "sync_partial"
                connection.last_error_message = run.error_summary

            self.repo.upsert_cursor(connection.id, "default", run.cursor_after, run.completed_at)

            AuditRepository(self.db).create(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                action="integration.sync.completed" if run.status == IntegrationSyncStatus.SUCCEEDED else "integration.sync.partial",
                entity_type="integration_sync_run",
                entity_id=str(run.id),
                metadata_json=summary,
            )
            self.db.commit()
            self._record_metric(
                organization_id,
                "trigger_sync",
                0 if run.records_seen == 0 else (run.records_seen * 2.0),
                "success" if run.records_failed == 0 else "partial",
                {"records_seen": run.records_seen, "records_failed": run.records_failed},
            )
            self.db.refresh(run)
            return run
        except Exception as exc:
            run.status = IntegrationSyncStatus.FAILED
            run.completed_at = datetime.now(timezone.utc).isoformat()
            run.records_failed = max(run.records_failed, 1)
            run.error_summary = str(exc)
            connection.status = IntegrationConnectionStatus.FAILED
            connection.last_error_at = run.completed_at
            connection.last_error_code = "sync_failed"
            connection.last_error_message = str(exc)
            self.db.commit()
            self._record_error(organization_id, "trigger_sync", "sync_failed", str(exc), severity="high", retryable=True, metadata={"connection_id": str(connection_id)})
            raise

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
            normalized_json={"event_type": event_type, "received_at": datetime.now(timezone.utc).isoformat()},
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
