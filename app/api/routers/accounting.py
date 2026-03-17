from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.schemas.accounting import (
    AccountBalanceResponse,
    AccountCreateRequest,
    AccountLedgerLineResponse,
    AccountListResponse,
    AccountResponse,
    AccountUpdateRequest,
    FinancialPeriodCreateRequest,
    FinancialPeriodListResponse,
    FinancialPeriodResponse,
    FinancialPeriodUpdateRequest,
    JournalCreateRequest,
    JournalListResponse,
    JournalPostResponse,
    JournalResponse,
    JournalReverseRequest,
    JournalUpdateRequest,
    JournalVoidRequest,
    LedgerEntryResponse,
    TrialBalanceResponse,
)
from app.services.account_service import AccountService
from app.services.journal_service import JournalService
from app.services.ledger_service import LedgerService
from app.services.period_service import PeriodService

router = APIRouter(prefix="/organizations/{organization_id}", tags=["accounting"])


@router.post("/accounts", response_model=AccountResponse)
def create_account(organization_id: str, payload: AccountCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("accounts.create")), db: Session = Depends(get_db)):
    return AccountService(db).create(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/accounts", response_model=AccountListResponse)
def list_accounts(organization_id: str, search: str | None = Query(None), _=Depends(require_permission("accounts.read")), db: Session = Depends(get_db)):
    return AccountListResponse(items=AccountService(db).accounts.list(organization_id, search))


@router.get("/accounts/search", response_model=AccountListResponse)
def search_accounts(organization_id: str, q: str = Query(""), _=Depends(require_permission("accounts.read")), db: Session = Depends(get_db)):
    return AccountListResponse(items=AccountService(db).accounts.list(organization_id, q))


@router.get("/accounts/{account_id}", response_model=AccountResponse)
def get_account(organization_id: str, account_id: str, _=Depends(require_permission("accounts.read")), db: Session = Depends(get_db)):
    return AccountService(db).accounts.get(organization_id, account_id)


@router.patch("/accounts/{account_id}", response_model=AccountResponse)
def update_account(organization_id: str, account_id: str, payload: AccountUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("accounts.update")), db: Session = Depends(get_db)):
    return AccountService(db).update(organization_id, account_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/accounts/{account_id}")
def archive_account(organization_id: str, account_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("accounts.archive")), db: Session = Depends(get_db)):
    AccountService(db).archive(organization_id, account_id, current_user.id)
    return {"message": "archived"}


@router.get("/accounts/{account_id}/balance", response_model=AccountBalanceResponse)
def account_balance(organization_id: str, account_id: str, _=Depends(require_permission("ledger.read")), db: Session = Depends(get_db)):
    bal = AccountService(db).accounts.get_balance(organization_id, account_id)
    return AccountBalanceResponse(account_id=account_id, closing_debit=bal.closing_debit, closing_credit=bal.closing_credit)


@router.get("/accounts/{account_id}/ledger", response_model=list[AccountLedgerLineResponse])
def account_ledger(organization_id: str, account_id: str, _=Depends(require_permission("ledger.read")), db: Session = Depends(get_db)):
    rows = LedgerService(db).account_ledger(organization_id, account_id)
    return [
        AccountLedgerLineResponse(
            journal_id=je.id,
            entry_number=je.entry_number,
            entry_date=je.entry_date,
            description=jl.description,
            debit_amount=jl.debit_amount,
            credit_amount=jl.credit_amount,
        )
        for jl, je in rows
    ]


@router.post("/journals", response_model=JournalResponse)
def create_journal(organization_id: str, payload: JournalCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("journals.create")), db: Session = Depends(get_db)):
    return JournalService(db).create(organization_id, current_user.id, payload.model_dump())


@router.get("/journals", response_model=JournalListResponse)
def list_journals(organization_id: str, _=Depends(require_permission("journals.read")), db: Session = Depends(get_db)):
    return JournalListResponse(items=JournalService(db).journals.list(organization_id))


@router.get("/journals/search", response_model=JournalListResponse)
def search_journals(organization_id: str, _=Depends(require_permission("journals.read")), db: Session = Depends(get_db)):
    return JournalListResponse(items=JournalService(db).journals.list(organization_id))


@router.get("/journals/{journal_id}", response_model=JournalResponse)
def get_journal(organization_id: str, journal_id: str, _=Depends(require_permission("journals.read")), db: Session = Depends(get_db)):
    return JournalService(db).journals.get(organization_id, journal_id)


@router.patch("/journals/{journal_id}", response_model=JournalResponse)
def update_journal(organization_id: str, journal_id: str, payload: JournalUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("journals.update")), db: Session = Depends(get_db)):
    return JournalService(db).update(organization_id, journal_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/journals/{journal_id}")
def delete_journal(organization_id: str, journal_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("journals.void")), db: Session = Depends(get_db)):
    JournalService(db).delete_or_void(organization_id, journal_id, current_user.id)
    return {"message": "deleted"}


@router.post("/journals/{journal_id}/post", response_model=JournalPostResponse)
def post_journal(organization_id: str, journal_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("journals.post")), db: Session = Depends(get_db)):
    j = JournalService(db).post(organization_id, journal_id, current_user.id)
    return JournalPostResponse(journal_id=j.id, status=j.status)


@router.post("/journals/{journal_id}/reverse", response_model=JournalPostResponse)
def reverse_journal(organization_id: str, journal_id: str, payload: JournalReverseRequest, current_user=Depends(get_current_user), _=Depends(require_permission("journals.reverse")), db: Session = Depends(get_db)):
    j = JournalService(db).reverse(organization_id, journal_id, current_user.id, payload.reversal_date, payload.reason)
    return JournalPostResponse(journal_id=j.id, status=j.status)


@router.post("/journals/{journal_id}/void", response_model=JournalResponse)
def void_journal(organization_id: str, journal_id: str, payload: JournalVoidRequest, current_user=Depends(get_current_user), _=Depends(require_permission("journals.void")), db: Session = Depends(get_db)):
    return JournalService(db).void(organization_id, journal_id, current_user.id, payload.reason)


@router.post("/periods", response_model=FinancialPeriodResponse)
def create_period(organization_id: str, payload: FinancialPeriodCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("periods.create")), db: Session = Depends(get_db)):
    return PeriodService(db).create(organization_id, current_user.id, payload.model_dump())


@router.get("/periods", response_model=FinancialPeriodListResponse)
def list_periods(organization_id: str, _=Depends(require_permission("periods.read")), db: Session = Depends(get_db)):
    return FinancialPeriodListResponse(items=PeriodService(db).periods.list(organization_id))


@router.get("/periods/{period_id}", response_model=FinancialPeriodResponse)
def get_period(organization_id: str, period_id: str, _=Depends(require_permission("periods.read")), db: Session = Depends(get_db)):
    return PeriodService(db).periods.get(organization_id, period_id)


@router.patch("/periods/{period_id}", response_model=FinancialPeriodResponse)
def update_period(organization_id: str, period_id: str, payload: FinancialPeriodUpdateRequest, _=Depends(require_permission("periods.update")), db: Session = Depends(get_db)):
    return PeriodService(db).update(organization_id, period_id, payload.model_dump(exclude_none=True))


@router.post("/periods/{period_id}/close", response_model=FinancialPeriodResponse)
def close_period(organization_id: str, period_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("periods.close")), db: Session = Depends(get_db)):
    return PeriodService(db).close(organization_id, period_id, current_user.id)


@router.post("/periods/{period_id}/lock", response_model=FinancialPeriodResponse)
def lock_period(organization_id: str, period_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("periods.lock")), db: Session = Depends(get_db)):
    return PeriodService(db).lock(organization_id, period_id, current_user.id)


@router.post("/periods/{period_id}/reopen", response_model=FinancialPeriodResponse)
def reopen_period(organization_id: str, period_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("periods.reopen")), db: Session = Depends(get_db)):
    return PeriodService(db).reopen(organization_id, period_id, current_user.id)


@router.get("/ledger", response_model=list[LedgerEntryResponse])
def ledger(organization_id: str, _=Depends(require_permission("ledger.read")), db: Session = Depends(get_db)):
    rows = LedgerService(db).general_ledger(organization_id)
    return [
        LedgerEntryResponse(
            journal_id=je.id,
            entry_number=je.entry_number,
            entry_date=je.entry_date,
            account_id=acct.id,
            account_code=acct.code,
            account_name=acct.name,
            debit_amount=jl.debit_amount,
            credit_amount=jl.credit_amount,
        )
        for jl, je, acct in rows
    ]


@router.get("/trial-balance", response_model=TrialBalanceResponse)
def trial_balance(organization_id: str, _=Depends(require_permission("trial_balance.read")), db: Session = Depends(get_db)):
    data = LedgerService(db).trial_balance(organization_id)
    return TrialBalanceResponse(**data)
