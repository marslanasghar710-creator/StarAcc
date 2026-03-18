from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.core.enums import BankTransactionStatus
from app.db.session import get_db
from app.schemas.banking import (
    BankAccountCreateRequest,
    BankAccountListResponse,
    BankAccountResponse,
    BankAccountUpdateRequest,
    BankTransactionCreateRequest,
    BankTransactionListResponse,
    BankTransactionReconcileRequest,
    BankTransactionResponse,
    BankTransactionUpdateRequest,
    CashPositionListResponse,
)
from app.services.bank_account_service import BankAccountService
from app.services.bank_transaction_service import BankTransactionService

router = APIRouter(prefix="/organizations/{organization_id}", tags=["banking"])


@router.post("/bank-accounts", response_model=BankAccountResponse)
def create_bank_account(organization_id: str, payload: BankAccountCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("bank_accounts.create")), db: Session = Depends(get_db)):
    return BankAccountService(db).create(organization_id, current_user.id, payload.model_dump())


@router.get("/bank-accounts", response_model=BankAccountListResponse)
def list_bank_accounts(organization_id: str, q: str = Query(""), _=Depends(require_permission("bank_accounts.read")), db: Session = Depends(get_db)):
    return BankAccountListResponse(items=BankAccountService(db).bank_accounts.list(organization_id, q))


@router.get("/bank-accounts/{bank_account_id}", response_model=BankAccountResponse)
def get_bank_account(organization_id: str, bank_account_id: str, _=Depends(require_permission("bank_accounts.read")), db: Session = Depends(get_db)):
    return BankAccountService(db).bank_accounts.get(organization_id, bank_account_id)


@router.patch("/bank-accounts/{bank_account_id}", response_model=BankAccountResponse)
def update_bank_account(organization_id: str, bank_account_id: str, payload: BankAccountUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("bank_accounts.update")), db: Session = Depends(get_db)):
    return BankAccountService(db).update(organization_id, bank_account_id, current_user.id, payload.model_dump(exclude_none=True))


@router.post("/bank-transactions", response_model=BankTransactionResponse)
def create_bank_transaction(organization_id: str, payload: BankTransactionCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("bank_transactions.create")), db: Session = Depends(get_db)):
    return BankTransactionService(db).create(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/bank-transactions", response_model=BankTransactionListResponse)
def list_bank_transactions(organization_id: str, bank_account_id: str | None = None, status: BankTransactionStatus | None = None, _=Depends(require_permission("bank_transactions.read")), db: Session = Depends(get_db)):
    return BankTransactionListResponse(items=BankTransactionService(db).transactions.list(organization_id, bank_account_id=bank_account_id, status=status))


@router.get("/bank-transactions/unreconciled", response_model=BankTransactionListResponse)
def list_unreconciled_bank_transactions(organization_id: str, bank_account_id: str | None = None, _=Depends(require_permission("bank_reconciliation.read")), db: Session = Depends(get_db)):
    return BankTransactionListResponse(items=BankTransactionService(db).transactions.list(organization_id, bank_account_id=bank_account_id, status=BankTransactionStatus.UNRECONCILED))


@router.get("/bank-transactions/{transaction_id}", response_model=BankTransactionResponse)
def get_bank_transaction(organization_id: str, transaction_id: str, _=Depends(require_permission("bank_transactions.read")), db: Session = Depends(get_db)):
    return BankTransactionService(db).transactions.get(organization_id, transaction_id)


@router.patch("/bank-transactions/{transaction_id}", response_model=BankTransactionResponse)
def update_bank_transaction(organization_id: str, transaction_id: str, payload: BankTransactionUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("bank_transactions.update")), db: Session = Depends(get_db)):
    return BankTransactionService(db).update(organization_id, transaction_id, current_user.id, payload.model_dump(exclude_none=True))


@router.post("/bank-transactions/{transaction_id}/reconcile-journal", response_model=BankTransactionResponse)
def reconcile_bank_transaction_to_journal(organization_id: str, transaction_id: str, payload: BankTransactionReconcileRequest, current_user=Depends(get_current_user), _=Depends(require_permission("bank_reconciliation.reconcile")), db: Session = Depends(get_db)):
    return BankTransactionService(db).reconcile_journal(organization_id, transaction_id, payload.journal_id, current_user.id)


@router.get("/banking/cash-position", response_model=CashPositionListResponse)
def cash_position(organization_id: str, _=Depends(require_permission("bank_reconciliation.read")), db: Session = Depends(get_db)):
    return CashPositionListResponse(items=BankTransactionService(db).cash_position(organization_id))
