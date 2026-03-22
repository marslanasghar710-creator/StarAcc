from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import (
    AIJobStatus,
    AIJobType,
    AutomationRuleType,
    DocumentExtractionStatus,
    SuggestionFeedbackAction,
    SuggestionSourceType,
    SuggestionStatus,
)
from app.core.exceptions import forbidden, not_found
from app.db.models import BankTransaction, Bill, Invoice, StoredFile
from app.repositories.ai_repository import AIRepository
from app.repositories.audit import AuditRepository
from app.repositories.bank_transaction_repository import BankTransactionRepository
from app.repositories.bill_repository import BillRepository
from app.repositories.file_repository import FileRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.services.ai_provider import HeuristicAIProvider
from app.services.bank_transaction_service import BankTransactionService
from app.services.file_storage_service import LocalFileStorageService

UTC = timezone.utc
logger = logging.getLogger(__name__)


class AIService:
    SUPPORTED_RULE_OPERATORS = {"equals", "contains", "in", "greater_than", "less_than", "exists"}
    SUPPORTED_TARGETS = {
        "bank_transaction": BankTransaction,
        "bill": Bill,
        "invoice": Invoice,
        "stored_file": StoredFile,
    }

    def __init__(self, db: Session):
        self.db = db
        self.repo = AIRepository(db)
        self.audit = AuditRepository(db)
        self.bank_transactions = BankTransactionRepository(db)
        self.bills = BillRepository(db)
        self.invoices = InvoiceRepository(db)
        self.files = FileRepository(db)
        self.provider = HeuristicAIProvider()
        self.storage = LocalFileStorageService()

    def _now(self):
        return datetime.now(UTC)

    def _expire_stale(self, organization_id: str):
        self.repo.expire_stale_suggestions(organization_id, now=self._now())

    def _validate_rule_payload(self, payload: dict):
        conditions = payload.get("conditions_json") or {}
        for condition in [*(conditions.get("all") or []), *(conditions.get("any") or [])]:
            if condition.get("operator") not in self.SUPPORTED_RULE_OPERATORS:
                raise forbidden("Unsupported automation rule operator")
        actions = payload.get("actions_json") or {}
        if not actions.get("suggestion_type"):
            raise forbidden("actions_json.suggestion_type is required")
        if not actions.get("reason_summary"):
            raise forbidden("actions_json.reason_summary is required")

    def create_rule(self, organization_id: str, actor_user_id: str, payload: dict):
        self._validate_rule_payload(payload)
        row = self.repo.create_rule(organization_id=organization_id, **payload)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="automation_rule.created", entity_type="automation_rule", entity_id=str(row.id))
        self.db.commit()
        self.db.refresh(row)
        return row

    def list_rules(self, organization_id: str, *, rule_type=None, active_only: bool | None = None):
        return self.repo.list_rules(organization_id, rule_type=rule_type, active_only=active_only)

    def get_rule(self, organization_id: str, rule_id):
        row = self.repo.get_rule(organization_id, rule_id)
        if not row:
            raise not_found("Automation rule not found")
        return row

    def update_rule(self, organization_id: str, rule_id, actor_user_id: str, payload: dict):
        row = self.get_rule(organization_id, rule_id)
        if "conditions_json" in payload or "actions_json" in payload:
            self._validate_rule_payload({**row.__dict__, **payload})
        for key, value in payload.items():
            setattr(row, key, value)
        if payload.get("archived_at"):
            row.is_active = False
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="automation_rule.updated", entity_type="automation_rule", entity_id=str(row.id))
        self.db.commit()
        self.db.refresh(row)
        return row

    def archive_rule(self, organization_id: str, rule_id, actor_user_id: str):
        row = self.get_rule(organization_id, rule_id)
        row.is_active = False
        row.archived_at = self._now()
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="automation_rule.archived", entity_type="automation_rule", entity_id=str(row.id))
        self.db.commit()

    def _normalize_target_payload(self, payload: dict):
        normalized = {}
        for key, value in payload.items():
            if isinstance(value, Decimal):
                normalized[key] = str(value)
            elif isinstance(value, datetime):
                normalized[key] = value.isoformat()
            else:
                normalized[key] = value
        return normalized

    def _evaluate_condition(self, target_payload: dict, condition: dict) -> bool:
        actual = target_payload.get(condition["field"])
        operator = condition["operator"]
        expected = condition.get("value")
        if operator == "exists":
            return actual is not None
        actual_text = "" if actual is None else str(actual).lower()
        if operator == "equals":
            return actual == expected
        if operator == "contains":
            return str(expected).lower() in actual_text
        if operator == "in":
            return actual in (expected or [])
        if operator == "greater_than":
            return Decimal(str(actual or 0)) > Decimal(str(expected))
        if operator == "less_than":
            return Decimal(str(actual or 0)) < Decimal(str(expected))
        return False

    def evaluate_rule(self, rule, target_payload: dict):
        conditions = rule.conditions_json or {}
        all_conditions = conditions.get("all") or []
        any_conditions = conditions.get("any") or []
        all_ok = all(self._evaluate_condition(target_payload, condition) for condition in all_conditions) if all_conditions else True
        any_ok = any(self._evaluate_condition(target_payload, condition) for condition in any_conditions) if any_conditions else True
        matched = all_ok and any_ok
        explanation = {
            "matched": matched,
            "all_results": [{"condition": c, "matched": self._evaluate_condition(target_payload, c)} for c in all_conditions],
            "any_results": [{"condition": c, "matched": self._evaluate_condition(target_payload, c)} for c in any_conditions],
            "priority": rule.priority,
        }
        suggestion_payload = None
        if matched:
            suggestion_payload = {
                "suggestion_type": rule.actions_json.get("suggestion_type"),
                "reason_summary": rule.actions_json.get("reason_summary"),
                "suggested_payload_json": rule.actions_json.get("suggestion_payload", {}),
                "auto_apply_safe": rule.actions_json.get("auto_apply_safe", False),
            }
        return matched, explanation, suggestion_payload

    def test_rule(self, organization_id: str, rule_id, payload: dict):
        rule = self.get_rule(organization_id, rule_id)
        matched, explanation, suggestion_payload = self.evaluate_rule(rule, payload)
        return {"matched": matched, "explanation": explanation, "suggestion_payload": suggestion_payload}

    def _assert_target_in_org(self, organization_id: str, entity_type: str, entity_id: str):
        model = self.SUPPORTED_TARGETS.get(entity_type)
        if not model:
            raise forbidden("Unsupported suggestion target entity type")
        row = self.db.get(model, entity_id)
        if not row or str(getattr(row, "organization_id", None)) != str(organization_id):
            raise forbidden("Suggestion target must belong to the same organization")
        return row

    def _serialize_entity(self, entity_type: str, entity):
        if entity_type == "bank_transaction":
            return {
                "id": str(entity.id),
                "description": entity.description,
                "reference": entity.reference,
                "memo": entity.memo,
                "amount": entity.amount,
                "source_type": entity.source_type,
                "source_module": entity.source_module,
                "status": entity.status.value,
                "tax_code_id": str(entity.tax_code_id) if entity.tax_code_id else None,
                "target_account_id": str(entity.target_account_id) if entity.target_account_id else None,
            }
        if entity_type == "bill":
            return {"id": str(entity.id), "reference": entity.reference, "supplier_invoice_number": entity.supplier_invoice_number, "notes": entity.notes, "status": entity.status.value}
        if entity_type == "invoice":
            return {"id": str(entity.id), "reference": entity.reference, "customer_po_number": entity.customer_po_number, "notes": entity.notes, "status": entity.status.value}
        if entity_type == "stored_file":
            return {"id": str(entity.id), "original_file_name": entity.original_file_name, "mime_type": entity.mime_type}
        return {"id": str(entity.id)}

    def _create_suggestion_record(self, organization_id: str, target_entity_type: str, target_entity_id: str, *, suggestion_type: str, reason_summary: str, suggested_payload_json: dict, explanation_json: dict, source_type: SuggestionSourceType, provider_name: str | None, provider_model: str | None, provider_version: str | None, confidence_score: Decimal | None, input_fingerprint: str | None):
        expires_at = self._now() + timedelta(days=settings.ai_suggestion_ttl_days)
        return self.repo.create_suggestion(
            organization_id=organization_id,
            target_entity_type=target_entity_type,
            target_entity_id=str(target_entity_id),
            suggestion_type=suggestion_type,
            status=SuggestionStatus.PENDING,
            confidence_score=confidence_score,
            reason_summary=reason_summary,
            explanation_json=explanation_json,
            suggested_payload_json=suggested_payload_json,
            source_type=source_type,
            provider_name=provider_name,
            provider_model=provider_model,
            provider_version=provider_version,
            input_fingerprint=input_fingerprint,
            expires_at=expires_at,
        )

    def _record_job(self, organization_id: str, *, job_type: AIJobType, target_entity_type: str, target_entity_id: str, payload_json: dict | None = None):
        return self.repo.create_job(
            organization_id=organization_id,
            job_type=job_type,
            target_entity_type=target_entity_type,
            target_entity_id=str(target_entity_id),
            status=AIJobStatus.PENDING,
            attempts=0,
            scheduled_at=self._now(),
            payload_json=payload_json,
        )

    def list_suggestions(self, organization_id: str, *, status=None, suggestion_type=None, target_entity_type=None, target_entity_id=None):
        self._expire_stale(organization_id)
        self.db.commit()
        return self.repo.list_suggestions(organization_id, status=status, suggestion_type=suggestion_type, target_entity_type=target_entity_type, target_entity_id=target_entity_id)

    def get_suggestion(self, organization_id: str, suggestion_id):
        self._expire_stale(organization_id)
        row = self.repo.get_suggestion(organization_id, suggestion_id)
        if not row:
            raise not_found("Suggestion not found")
        return row

    def _run_rule_generation(self, organization_id: str, *, rule_type: AutomationRuleType, target_entity_type: str, target_entity_id: str, target_payload: dict):
        generated = []
        used_suggestion_types: set[str] = set()
        for rule in self.repo.list_rules(organization_id, rule_type=rule_type, active_only=True):
            matched, explanation, suggestion_payload = self.evaluate_rule(rule, target_payload)
            if not matched:
                continue
            suggestion_type = suggestion_payload["suggestion_type"]
            if suggestion_type in used_suggestion_types:
                continue
            used_suggestion_types.add(suggestion_type)
            generated.append(
                self._create_suggestion_record(
                    organization_id,
                    target_entity_type,
                    str(target_entity_id),
                    suggestion_type=suggestion_type,
                    reason_summary=suggestion_payload["reason_summary"],
                    suggested_payload_json={**suggestion_payload["suggested_payload_json"], "matched_rule_id": str(rule.id), "auto_apply_safe": suggestion_payload["auto_apply_safe"]},
                    explanation_json={"rule_id": str(rule.id), "rule_name": rule.name, "match": explanation},
                    source_type=SuggestionSourceType.RULE,
                    provider_name=None,
                    provider_model=None,
                    provider_version=None,
                    confidence_score=Decimal("1.0"),
                    input_fingerprint=hashlib.sha256(repr((target_entity_type, target_payload, rule.id)).encode()).hexdigest(),
                )
            )
        return generated

    def generate_reconciliation_suggestions(self, organization_id: str, bank_transaction_id, actor_user_id: str):
        txn = self.bank_transactions.get(organization_id, bank_transaction_id)
        if not txn:
            raise not_found("Bank transaction not found")
        target_payload = self._normalize_target_payload(self._serialize_entity("bank_transaction", txn))
        job = self._record_job(organization_id, job_type=AIJobType.RECONCILIATION_SUGGESTIONS, target_entity_type="bank_transaction", target_entity_id=str(bank_transaction_id), payload_json=target_payload)
        suggestion_set = self.repo.create_reconciliation_set(
            organization_id=organization_id,
            bank_transaction_id=bank_transaction_id,
            generation_status=AIJobStatus.RUNNING,
            source_summary_json={"target_description": txn.description},
        )
        now = self._now()
        job.status = AIJobStatus.RUNNING
        job.started_at = now

        generated = self._run_rule_generation(organization_id, rule_type=AutomationRuleType.BANK_TRANSACTION_CATEGORIZATION, target_entity_type="bank_transaction", target_entity_id=str(bank_transaction_id), target_payload=target_payload)
        for provider_suggestion in self.provider.suggest_document_coding(entity_type="bank_transaction", entity_payload=target_payload):
            generated.append(
                self._create_suggestion_record(
                    organization_id,
                    "bank_transaction",
                    str(bank_transaction_id),
                    suggestion_type=provider_suggestion.suggestion_type,
                    reason_summary=provider_suggestion.reason_summary,
                    suggested_payload_json=provider_suggestion.suggested_payload_json,
                    explanation_json=provider_suggestion.explanation_json,
                    source_type=provider_suggestion.source_type,
                    provider_name=provider_suggestion.provider_name,
                    provider_model=provider_suggestion.provider_model,
                    provider_version=provider_suggestion.provider_version,
                    confidence_score=provider_suggestion.confidence_score,
                    input_fingerprint=provider_suggestion.input_fingerprint,
                )
            )
        suggestion_set.generation_status = AIJobStatus.SUCCEEDED
        suggestion_set.generated_at = self._now()
        suggestion_set.source_summary_json = {"generated_suggestion_count": len(generated), "bank_transaction_id": str(bank_transaction_id)}
        job.status = AIJobStatus.SUCCEEDED
        job.completed_at = self._now()
        job.result_json = {"generated_suggestion_ids": [str(item.id) for item in generated]}
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="ai.suggestions.generated", entity_type="bank_transaction", entity_id=str(bank_transaction_id), metadata_json={"count": len(generated)})
        self.db.commit()
        return suggestion_set

    def generate_document_coding_suggestions(self, organization_id: str, entity_type: str, entity_id: str, actor_user_id: str):
        target = self._assert_target_in_org(organization_id, entity_type, entity_id)
        payload = self._normalize_target_payload(self._serialize_entity(entity_type, target))
        job = self._record_job(organization_id, job_type=AIJobType.CODING_SUGGESTIONS, target_entity_type=entity_type, target_entity_id=str(entity_id), payload_json=payload)
        job.status = AIJobStatus.RUNNING
        job.started_at = self._now()
        generated = self._run_rule_generation(
            organization_id,
            rule_type=AutomationRuleType.ACCOUNT_CODING,
            target_entity_type=entity_type,
            target_entity_id=str(entity_id),
            target_payload=payload,
        )
        job.status = AIJobStatus.SUCCEEDED
        job.completed_at = self._now()
        job.result_json = {"generated_suggestion_ids": [str(item.id) for item in generated]}
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="ai.document_coding.generated", entity_type=entity_type, entity_id=str(entity_id), metadata_json={"count": len(generated)})
        self.db.commit()
        return generated

    def _apply_bank_transaction_suggestion(self, organization_id: str, suggestion, actor_user_id: str):
        payload = dict(suggestion.suggested_payload_json or {})
        safe_payload = {key: value for key, value in payload.items() if key in {"target_account_id", "tax_code_id", "memo", "reference"} and value is not None}
        if not safe_payload:
            return False
        BankTransactionService(self.db).update(organization_id, suggestion.target_entity_id, actor_user_id, safe_payload)
        return True

    def accept_suggestion(self, organization_id: str, suggestion_id, actor_user_id: str, feedback_reason: str | None = None):
        suggestion = self.get_suggestion(organization_id, suggestion_id)
        if suggestion.status in {SuggestionStatus.REJECTED, SuggestionStatus.EXPIRED, SuggestionStatus.APPLIED}:
            raise forbidden("Suggestion can no longer be accepted")
        self._assert_target_in_org(organization_id, suggestion.target_entity_type, suggestion.target_entity_id)
        suggestion.reviewed_by = actor_user_id
        suggestion.reviewed_at = self._now()
        applied = False
        if suggestion.target_entity_type == "bank_transaction" and suggestion.suggestion_type == "bank_transaction_coding" and settings.ai_auto_apply_safe_workflows:
            applied = self._apply_bank_transaction_suggestion(organization_id, suggestion, actor_user_id)
        suggestion.status = SuggestionStatus.APPLIED if applied else SuggestionStatus.ACCEPTED
        if applied:
            suggestion.applied_at = self._now()
        feedback = self.repo.create_feedback(
            organization_id=organization_id,
            suggestion_id=suggestion.id,
            action=SuggestionFeedbackAction.ACCEPTED,
            feedback_reason=feedback_reason,
            user_id=actor_user_id,
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="ai.suggestion.accepted", entity_type="suggestion", entity_id=str(suggestion.id), metadata_json={"applied": applied})
        self.db.commit()
        self.db.refresh(suggestion)
        self.db.refresh(feedback)
        return suggestion, feedback

    def reject_suggestion(self, organization_id: str, suggestion_id, actor_user_id: str, feedback_reason: str | None = None):
        suggestion = self.get_suggestion(organization_id, suggestion_id)
        if suggestion.status in {SuggestionStatus.REJECTED, SuggestionStatus.APPLIED}:
            raise forbidden("Suggestion can no longer be rejected")
        suggestion.status = SuggestionStatus.REJECTED
        suggestion.reviewed_by = actor_user_id
        suggestion.reviewed_at = self._now()
        feedback = self.repo.create_feedback(
            organization_id=organization_id,
            suggestion_id=suggestion.id,
            action=SuggestionFeedbackAction.REJECTED,
            feedback_reason=feedback_reason,
            user_id=actor_user_id,
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="ai.suggestion.rejected", entity_type="suggestion", entity_id=str(suggestion.id), metadata_json={"reason": feedback_reason})
        self.db.commit()
        self.db.refresh(suggestion)
        self.db.refresh(feedback)
        return suggestion, feedback

    def create_document_extraction_job(self, organization_id: str, file_id, actor_user_id: str):
        file_row = self.files.get(organization_id, file_id)
        if not file_row:
            raise not_found("File not found")
        job = self.repo.create_document_job(
            organization_id=organization_id,
            file_id=file_id,
            status=DocumentExtractionStatus.PENDING,
            review_required=True,
        )
        ai_job = self._record_job(organization_id, job_type=AIJobType.DOCUMENT_EXTRACTION, target_entity_type="stored_file", target_entity_id=str(file_id), payload_json={"file_id": str(file_id)})
        ai_job.status = AIJobStatus.RUNNING
        ai_job.started_at = self._now()
        job.status = DocumentExtractionStatus.RUNNING
        full_path = self.storage.resolve_path(file_row.storage_path)
        try:
            text_content = None
            if full_path and self.storage.exists(file_row.storage_path):
                suffix = (file_row.file_extension or "").lower()
                if suffix in {"txt", "csv"}:
                    text_content = open(full_path, "r", encoding="utf-8", errors="ignore").read()[:20000]
            provider_result = self.provider.extract_document(file_name=file_row.original_file_name, mime_type=file_row.mime_type, text_content=text_content)
            job.status = DocumentExtractionStatus.SUCCEEDED
            job.classifier_label = provider_result.classifier_label
            job.classifier_confidence = provider_result.classifier_confidence
            job.extracted_fields_json = provider_result.extracted_fields
            job.review_required = provider_result.review_required
            job.provider_name = provider_result.provider_name
            job.provider_model = provider_result.provider_model
            job.completed_at = self._now()
            ai_job.status = AIJobStatus.SUCCEEDED
            ai_job.completed_at = self._now()
            ai_job.result_json = {
                "document_extraction_job_id": str(job.id),
                "classifier_label": provider_result.classifier_label.value,
                "review_required": provider_result.review_required,
            }
        except Exception as exc:  # pragma: no cover - defensive failure path
            logger.exception("document extraction failed")
            job.status = DocumentExtractionStatus.FAILED
            job.error_message = str(exc)
            ai_job.status = AIJobStatus.FAILED
            ai_job.error_message = "document extraction failed"
            ai_job.completed_at = self._now()
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="ai.document_extraction.created", entity_type="document_extraction_job", entity_id=str(job.id), metadata_json={"file_id": str(file_id)})
        self.db.commit()
        self.db.refresh(job)
        return job

    def list_document_jobs(self, organization_id: str, *, status=None):
        return self.repo.list_document_jobs(organization_id, status=status)

    def get_document_job(self, organization_id: str, job_id):
        job = self.repo.get_document_job(organization_id, job_id)
        if not job:
            raise not_found("Document extraction job not found")
        return job

    def document_job_result(self, organization_id: str, job_id):
        return self.get_document_job(organization_id, job_id)

    def list_jobs(self, organization_id: str, *, status=None):
        return self.repo.list_jobs(organization_id, status=status)

    def get_job(self, organization_id: str, job_id):
        job = self.repo.get_job(organization_id, job_id)
        if not job:
            raise not_found("AI job not found")
        return job
