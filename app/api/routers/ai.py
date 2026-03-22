from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.core.enums import AIJobStatus, AutomationRuleType, DocumentExtractionStatus, SuggestionStatus
from app.db.session import get_db
from app.schemas.ai import (
    AIJobListResponse,
    AIJobResponse,
    AutomationRuleCreateRequest,
    AutomationRuleListResponse,
    AutomationRuleResponse,
    AutomationRuleTestRequest,
    AutomationRuleTestResult,
    AutomationRuleUpdateRequest,
    DocumentExtractionJobListResponse,
    DocumentExtractionJobResponse,
    DocumentExtractionRequest,
    ReconciliationSuggestionSetResponse,
    SuggestionFeedbackResponse,
    SuggestionListResponse,
    SuggestionResponse,
    SuggestionReviewRequest,
)
from app.services.ai_service import AIService

router = APIRouter(prefix="/organizations/{organization_id}", tags=["ai_automation"])


@router.post("/automation-rules", response_model=AutomationRuleResponse)
def create_automation_rule(organization_id: str, payload: AutomationRuleCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("automation_rules.create")), db: Session = Depends(get_db)):
    return AIService(db).create_rule(organization_id, current_user.id, payload.model_dump())


@router.get("/automation-rules", response_model=AutomationRuleListResponse)
def list_automation_rules(organization_id: str, rule_type: AutomationRuleType | None = Query(None), active_only: bool | None = Query(None), _=Depends(require_permission("automation_rules.read")), db: Session = Depends(get_db)):
    return AutomationRuleListResponse(items=AIService(db).list_rules(organization_id, rule_type=rule_type, active_only=active_only))


@router.get("/automation-rules/{rule_id}", response_model=AutomationRuleResponse)
def get_automation_rule(organization_id: str, rule_id: UUID, _=Depends(require_permission("automation_rules.read")), db: Session = Depends(get_db)):
    return AIService(db).get_rule(organization_id, rule_id)


@router.patch("/automation-rules/{rule_id}", response_model=AutomationRuleResponse)
def update_automation_rule(organization_id: str, rule_id: UUID, payload: AutomationRuleUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("automation_rules.update")), db: Session = Depends(get_db)):
    return AIService(db).update_rule(organization_id, rule_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/automation-rules/{rule_id}")
def archive_automation_rule(organization_id: str, rule_id: UUID, current_user=Depends(get_current_user), _=Depends(require_permission("automation_rules.archive")), db: Session = Depends(get_db)):
    AIService(db).archive_rule(organization_id, rule_id, current_user.id)
    return {"message": "archived"}


@router.post("/automation-rules/{rule_id}/test", response_model=AutomationRuleTestResult)
def test_automation_rule(organization_id: str, rule_id: UUID, payload: AutomationRuleTestRequest, _=Depends(require_permission("automation_rules.read")), db: Session = Depends(get_db)):
    return AIService(db).test_rule(organization_id, rule_id, payload.target_payload)


@router.get("/suggestions", response_model=SuggestionListResponse)
def list_suggestions(organization_id: str, status: SuggestionStatus | None = Query(None), suggestion_type: str | None = Query(None), _=Depends(require_permission("suggestions.read")), db: Session = Depends(get_db)):
    return SuggestionListResponse(items=AIService(db).list_suggestions(organization_id, status=status, suggestion_type=suggestion_type))


@router.get("/suggestions/for/{entity_type}/{entity_id}", response_model=SuggestionListResponse)
def get_suggestions_for_entity(organization_id: str, entity_type: str, entity_id: str, _=Depends(require_permission("suggestions.read")), db: Session = Depends(get_db)):
    return SuggestionListResponse(items=AIService(db).list_suggestions(organization_id, target_entity_type=entity_type, target_entity_id=entity_id))


@router.get("/suggestions/{suggestion_id}", response_model=SuggestionResponse)
def get_suggestion(organization_id: str, suggestion_id: UUID, _=Depends(require_permission("suggestions.read")), db: Session = Depends(get_db)):
    return AIService(db).get_suggestion(organization_id, suggestion_id)


@router.post("/suggestions/{suggestion_id}/accept", response_model=SuggestionFeedbackResponse)
def accept_suggestion(organization_id: str, suggestion_id: UUID, payload: SuggestionReviewRequest, current_user=Depends(get_current_user), _=Depends(require_permission("suggestions.review")), db: Session = Depends(get_db)):
    _, feedback = AIService(db).accept_suggestion(organization_id, suggestion_id, current_user.id, payload.feedback_reason)
    return feedback


@router.post("/suggestions/{suggestion_id}/reject", response_model=SuggestionFeedbackResponse)
def reject_suggestion(organization_id: str, suggestion_id: UUID, payload: SuggestionReviewRequest, current_user=Depends(get_current_user), _=Depends(require_permission("suggestions.review")), db: Session = Depends(get_db)):
    _, feedback = AIService(db).reject_suggestion(organization_id, suggestion_id, current_user.id, payload.feedback_reason)
    return feedback


@router.post("/document-intelligence/extract", response_model=DocumentExtractionJobResponse)
def create_document_extraction(organization_id: str, payload: DocumentExtractionRequest, current_user=Depends(get_current_user), _=Depends(require_permission("document_intelligence.run")), db: Session = Depends(get_db)):
    return AIService(db).create_document_extraction_job(organization_id, payload.file_id, current_user.id)


@router.get("/document-intelligence/jobs", response_model=DocumentExtractionJobListResponse)
def list_document_jobs(organization_id: str, status: DocumentExtractionStatus | None = Query(None), _=Depends(require_permission("document_intelligence.read")), db: Session = Depends(get_db)):
    return DocumentExtractionJobListResponse(items=AIService(db).list_document_jobs(organization_id, status=status))


@router.get("/document-intelligence/jobs/{job_id}", response_model=DocumentExtractionJobResponse)
def get_document_job(organization_id: str, job_id: UUID, _=Depends(require_permission("document_intelligence.read")), db: Session = Depends(get_db)):
    return AIService(db).get_document_job(organization_id, job_id)


@router.get("/document-intelligence/jobs/{job_id}/result", response_model=DocumentExtractionJobResponse)
def get_document_job_result(organization_id: str, job_id: UUID, _=Depends(require_permission("document_intelligence.read")), db: Session = Depends(get_db)):
    return AIService(db).document_job_result(organization_id, job_id)


@router.post("/bank-transactions/{bank_transaction_id}/generate-suggestions", response_model=ReconciliationSuggestionSetResponse)
def generate_bank_transaction_suggestions(organization_id: str, bank_transaction_id: UUID, current_user=Depends(get_current_user), _=Depends(require_permission("suggestions.review")), db: Session = Depends(get_db)):
    return AIService(db).generate_reconciliation_suggestions(organization_id, bank_transaction_id, current_user.id)


@router.get("/bank-transactions/{bank_transaction_id}/suggestions", response_model=SuggestionListResponse)
def get_bank_transaction_suggestions(organization_id: str, bank_transaction_id: UUID, _=Depends(require_permission("suggestions.read")), db: Session = Depends(get_db)):
    return SuggestionListResponse(items=AIService(db).list_suggestions(organization_id, target_entity_type="bank_transaction", target_entity_id=str(bank_transaction_id)))


@router.post("/documents/{entity_type}/{entity_id}/generate-coding-suggestions", response_model=SuggestionListResponse)
def generate_document_coding_suggestions(organization_id: str, entity_type: str, entity_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("suggestions.review")), db: Session = Depends(get_db)):
    return SuggestionListResponse(items=AIService(db).generate_document_coding_suggestions(organization_id, entity_type, entity_id, current_user.id))


@router.get("/documents/{entity_type}/{entity_id}/coding-suggestions", response_model=SuggestionListResponse)
def get_document_coding_suggestions(organization_id: str, entity_type: str, entity_id: str, _=Depends(require_permission("suggestions.read")), db: Session = Depends(get_db)):
    return SuggestionListResponse(items=AIService(db).list_suggestions(organization_id, target_entity_type=entity_type, target_entity_id=entity_id))


@router.get("/ai-jobs", response_model=AIJobListResponse)
def list_ai_jobs(organization_id: str, status: AIJobStatus | None = Query(None), _=Depends(require_permission("ai_jobs.read")), db: Session = Depends(get_db)):
    return AIJobListResponse(items=AIService(db).list_jobs(organization_id, status=status))


@router.get("/ai-jobs/{job_id}", response_model=AIJobResponse)
def get_ai_job(organization_id: str, job_id: UUID, _=Depends(require_permission("ai_jobs.read")), db: Session = Depends(get_db)):
    return AIService(db).get_job(organization_id, job_id)
