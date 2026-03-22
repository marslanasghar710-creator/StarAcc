from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.enums import AIJobStatus, DocumentExtractionStatus, SuggestionStatus
from app.db.models import AIProcessingJob, AutomationRule, DocumentExtractionJob, ReconciliationSuggestionSet, Suggestion, SuggestionFeedback

UTC = timezone.utc


class AIRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_rule(self, **kwargs):
        row = AutomationRule(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_rule(self, organization_id, rule_id):
        return self.db.scalar(
            select(AutomationRule).where(
                AutomationRule.organization_id == organization_id,
                AutomationRule.id == rule_id,
                AutomationRule.deleted_at.is_(None),
            )
        )

    def list_rules(self, organization_id, *, rule_type=None, active_only: bool | None = None):
        query = select(AutomationRule).where(AutomationRule.organization_id == organization_id, AutomationRule.deleted_at.is_(None))
        if rule_type:
            query = query.where(AutomationRule.rule_type == rule_type)
        if active_only is True:
            query = query.where(AutomationRule.is_active.is_(True), AutomationRule.archived_at.is_(None))
        if active_only is False:
            query = query.where(or_(AutomationRule.is_active.is_(False), AutomationRule.archived_at.is_not(None)))
        return list(self.db.scalars(query.order_by(AutomationRule.priority.asc(), AutomationRule.created_at.asc())).all())

    def create_suggestion(self, **kwargs):
        row = Suggestion(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_suggestion(self, organization_id, suggestion_id):
        return self.db.scalar(
            select(Suggestion).where(
                Suggestion.organization_id == organization_id,
                Suggestion.id == suggestion_id,
                Suggestion.deleted_at.is_(None),
            )
        )

    def list_suggestions(self, organization_id, *, status: SuggestionStatus | None = None, suggestion_type: str | None = None, target_entity_type: str | None = None, target_entity_id: str | None = None):
        query = select(Suggestion).where(Suggestion.organization_id == organization_id, Suggestion.deleted_at.is_(None))
        if status:
            query = query.where(Suggestion.status == status)
        if suggestion_type:
            query = query.where(Suggestion.suggestion_type == suggestion_type)
        if target_entity_type:
            query = query.where(Suggestion.target_entity_type == target_entity_type)
        if target_entity_id:
            query = query.where(Suggestion.target_entity_id == str(target_entity_id))
        return list(self.db.scalars(query.order_by(Suggestion.created_at.desc())).all())

    def create_feedback(self, **kwargs):
        row = SuggestionFeedback(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def create_document_job(self, **kwargs):
        row = DocumentExtractionJob(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_document_job(self, organization_id, job_id):
        return self.db.scalar(
            select(DocumentExtractionJob).where(
                DocumentExtractionJob.organization_id == organization_id,
                DocumentExtractionJob.id == job_id,
                DocumentExtractionJob.deleted_at.is_(None),
            )
        )

    def list_document_jobs(self, organization_id, *, status: DocumentExtractionStatus | None = None):
        query = select(DocumentExtractionJob).where(DocumentExtractionJob.organization_id == organization_id, DocumentExtractionJob.deleted_at.is_(None))
        if status:
            query = query.where(DocumentExtractionJob.status == status)
        return list(self.db.scalars(query.order_by(DocumentExtractionJob.created_at.desc())).all())

    def create_reconciliation_set(self, **kwargs):
        row = ReconciliationSuggestionSet(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def latest_reconciliation_set(self, organization_id, bank_transaction_id):
        return self.db.scalar(
            select(ReconciliationSuggestionSet)
            .where(
                ReconciliationSuggestionSet.organization_id == organization_id,
                ReconciliationSuggestionSet.bank_transaction_id == bank_transaction_id,
                ReconciliationSuggestionSet.deleted_at.is_(None),
            )
            .order_by(ReconciliationSuggestionSet.created_at.desc())
        )

    def create_job(self, **kwargs):
        row = AIProcessingJob(**kwargs)
        self.db.add(row)
        self.db.flush()
        return row

    def get_job(self, organization_id, job_id):
        return self.db.scalar(
            select(AIProcessingJob).where(
                AIProcessingJob.organization_id == organization_id,
                AIProcessingJob.id == job_id,
                AIProcessingJob.deleted_at.is_(None),
            )
        )

    def list_jobs(self, organization_id, *, status: AIJobStatus | None = None):
        query = select(AIProcessingJob).where(AIProcessingJob.organization_id == organization_id, AIProcessingJob.deleted_at.is_(None))
        if status:
            query = query.where(AIProcessingJob.status == status)
        return list(self.db.scalars(query.order_by(AIProcessingJob.created_at.desc())).all())

    def expire_stale_suggestions(self, organization_id, *, now: datetime):
        suggestions = list(
            self.db.scalars(
                select(Suggestion).where(
                    Suggestion.organization_id == organization_id,
                    Suggestion.status == SuggestionStatus.PENDING,
                    Suggestion.expires_at.is_not(None),
                    Suggestion.expires_at < now,
                    Suggestion.deleted_at.is_(None),
                )
            ).all()
        )
        for suggestion in suggestions:
            suggestion.status = SuggestionStatus.EXPIRED
        self.db.flush()
        return suggestions
