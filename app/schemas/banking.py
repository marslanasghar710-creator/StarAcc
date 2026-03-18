from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import BankTransactionStatus, BankTransactionType
from app.schemas.common import ORMModel


class BankAccountCreateRequest(BaseModel):
    account_id: UUID
    name: str
    bank_name: str | None = None
    account_number_mask: str | None = None
    currency_code: str
    opening_balance: Decimal = Decimal("0")


class BankAccountUpdateRequest(BaseModel):
    name: str | None = None
    bank_name: str | None = None
    account_number_mask: str | None = None
    currency_code: str | None = None
    opening_balance: Decimal | None = None
    is_active: bool | None = None


class BankAccountResponse(ORMModel):
    id: UUID
    organization_id: UUID
    account_id: UUID
    name: str
    bank_name: str | None
    account_number_mask: str | None
    currency_code: str
    opening_balance: Decimal
    is_active: bool
    last_reconciled_at: datetime | None


class BankAccountListResponse(BaseModel):
    items: list[BankAccountResponse]


class BankTransactionCreateRequest(BaseModel):
    bank_account_id: UUID
    transaction_date: date
    posted_date: date | None = None
    transaction_type: BankTransactionType
    amount: Decimal
    description: str
    reference: str | None = None
    memo: str | None = None
    source_module: str | None = None
    source_type: str | None = None
    source_id: str | None = None


class BankTransactionUpdateRequest(BaseModel):
    posted_date: date | None = None
    description: str | None = None
    reference: str | None = None
    memo: str | None = None


class BankTransactionResponse(ORMModel):
    id: UUID
    organization_id: UUID
    bank_account_id: UUID
    transaction_date: date
    posted_date: date | None
    transaction_type: BankTransactionType
    amount: Decimal
    description: str
    reference: str | None
    memo: str | None
    status: BankTransactionStatus
    matched_journal_id: UUID | None
    source_module: str | None
    source_type: str | None
    source_id: str | None
    reconciled_at: datetime | None


class BankTransactionListResponse(BaseModel):
    items: list[BankTransactionResponse]


class BankTransactionReconcileRequest(BaseModel):
    journal_id: UUID


class CashPositionResponse(BaseModel):
    bank_account_id: UUID
    bank_account_name: str
    gl_account_id: UUID
    opening_balance: Decimal
    ledger_balance: Decimal
    unreconciled_delta: Decimal


class CashPositionListResponse(BaseModel):
    items: list[CashPositionResponse]
