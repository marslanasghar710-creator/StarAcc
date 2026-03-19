import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import BankTransactionStatus, BankTransactionType
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class BankAccount(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "bank_accounts"
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_bank_account_org_name"),
        UniqueConstraint("organization_id", "account_id", name="uq_bank_account_org_account"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    bank_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    account_number_mask: Mapped[str | None] = mapped_column(String(32), nullable=True)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    last_reconciled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class BankTransaction(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "bank_transactions"
    __table_args__ = (
        CheckConstraint("amount <> 0", name="ck_bank_transaction_amount_non_zero"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    bank_account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=False, index=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    posted_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    transaction_type: Mapped[BankTransactionType] = mapped_column(Enum(BankTransactionType, name="bank_transaction_type"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[BankTransactionStatus] = mapped_column(Enum(BankTransactionStatus, name="bank_transaction_status"), nullable=False, default=BankTransactionStatus.UNRECONCILED)
    matched_journal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"), nullable=True)
    source_module: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    tax_code_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tax_codes.id"), nullable=True)
    tax_breakdown_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    taxable_amount: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    tax_amount: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    gross_amount: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    tax_inclusive_flag: Mapped[bool | None] = mapped_column(nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reconciled_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reconciled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
