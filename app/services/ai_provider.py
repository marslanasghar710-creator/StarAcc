from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

from app.core.enums import DocumentClassifierLabel, SuggestionSourceType


@dataclass
class ProviderExtractionResult:
    classifier_label: DocumentClassifierLabel
    classifier_confidence: Decimal
    extracted_fields: dict
    review_required: bool
    provider_name: str | None
    provider_model: str | None


@dataclass
class ProviderSuggestionResult:
    suggestion_type: str
    confidence_score: Decimal
    reason_summary: str
    explanation_json: dict
    suggested_payload_json: dict
    source_type: SuggestionSourceType
    provider_name: str | None
    provider_model: str | None
    provider_version: str | None
    input_fingerprint: str


class BaseAIProvider:
    name = "base"
    model = "deterministic"
    version = "1"

    def extract_document(self, *, file_name: str, mime_type: str, text_content: str | None) -> ProviderExtractionResult:  # pragma: no cover
        raise NotImplementedError

    def suggest_document_coding(self, *, entity_type: str, entity_payload: dict) -> list[ProviderSuggestionResult]:  # pragma: no cover
        raise NotImplementedError


class HeuristicAIProvider(BaseAIProvider):
    name = "heuristic"
    model = "local-rules"
    version = "1"

    def extract_document(self, *, file_name: str, mime_type: str, text_content: str | None) -> ProviderExtractionResult:
        source = f"{file_name}\n{text_content or ''}".lower()
        label = DocumentClassifierLabel.UNKNOWN
        confidence = Decimal("0.40")
        if "invoice" in source:
            label = DocumentClassifierLabel.INVOICE
            confidence = Decimal("0.88")
        elif "bill" in source or "supplier" in source:
            label = DocumentClassifierLabel.BILL
            confidence = Decimal("0.83")
        elif "receipt" in source:
            label = DocumentClassifierLabel.RECEIPT
            confidence = Decimal("0.78")
        elif "statement" in source:
            label = DocumentClassifierLabel.STATEMENT
            confidence = Decimal("0.74")

        extracted = {}
        patterns = {
            "invoice_number": r"(?:invoice|bill)\s*(?:number|no)?[:#\s]+([A-Z0-9\-]+)",
            "total": r"total[:\s]+([0-9]+(?:\.[0-9]{1,2})?)",
            "tax_amount": r"tax[:\s]+([0-9]+(?:\.[0-9]{1,2})?)",
            "issue_date": r"(?:issue date|date)[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})",
            "due_date": r"due date[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})",
        }
        for key, pattern in patterns.items():
            match = re.search(pattern, source, re.IGNORECASE)
            if match:
                extracted[key] = match.group(1)
        if text_content:
            first_nonempty = next((line.strip() for line in text_content.splitlines() if line.strip()), None)
            if first_nonempty:
                extracted.setdefault("headline", first_nonempty[:255])

        review_required = confidence < Decimal("0.90") or not extracted
        return ProviderExtractionResult(
            classifier_label=label,
            classifier_confidence=confidence,
            extracted_fields=extracted,
            review_required=review_required,
            provider_name=self.name,
            provider_model=self.model,
        )

    def suggest_document_coding(self, *, entity_type: str, entity_payload: dict) -> list[ProviderSuggestionResult]:
        fingerprint = hashlib.sha256(repr((entity_type, entity_payload)).encode()).hexdigest()
        suggestions: list[ProviderSuggestionResult] = []
        if entity_type == "bank_transaction":
            description = (entity_payload.get("description") or "").lower()
            payload = {}
            reason = "No heuristic bank coding match found"
            confidence = Decimal("0.35")
            if "rent" in description:
                payload["account_code_hint"] = "rent_expense"
                reason = "Keyword 'rent' suggests a rent or occupancy expense"
                confidence = Decimal("0.82")
            elif "salary" in description or "payroll" in description:
                payload["account_code_hint"] = "payroll_expense"
                reason = "Payroll wording suggests a payroll-related expense"
                confidence = Decimal("0.79")
            elif "transfer" in description:
                payload["match_type"] = "possible_transfer"
                reason = "Transfer wording suggests another bank account movement"
                confidence = Decimal("0.75")
            suggestions.append(
                ProviderSuggestionResult(
                    suggestion_type="bank_transaction_coding",
                    confidence_score=confidence,
                    reason_summary=reason,
                    explanation_json={"heuristic": description[:120]},
                    suggested_payload_json=payload,
                    source_type=SuggestionSourceType.HEURISTIC,
                    provider_name=self.name,
                    provider_model=self.model,
                    provider_version=self.version,
                    input_fingerprint=fingerprint,
                )
            )
        return suggestions


def load_file_text(storage_path: str) -> str | None:
    path = Path(storage_path)
    if not path.exists() or path.suffix.lower() not in {".txt", ".csv"}:
        return None
    return path.read_text(errors="ignore")[:20000]
