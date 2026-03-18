from enum import StrEnum


class UserStatus(StrEnum):
    ACTIVE = "active"
    INVITED = "invited"
    DISABLED = "disabled"
    LOCKED = "locked"


class OrganizationStatus(StrEnum):
    ACTIVE = "active"
    DISABLED = "disabled"


class MembershipStatus(StrEnum):
    INVITED = "invited"
    ACTIVE = "active"
    SUSPENDED = "suspended"


class InvitationStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class AccountType(StrEnum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"


class NormalBalance(StrEnum):
    DEBIT = "debit"
    CREDIT = "credit"


class JournalStatus(StrEnum):
    DRAFT = "draft"
    POSTED = "posted"
    REVERSED = "reversed"
    VOIDED = "voided"


class PeriodStatus(StrEnum):
    OPEN = "open"
    CLOSED = "closed"
    LOCKED = "locked"


class InvoiceStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    SENT = "sent"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    VOIDED = "voided"
    CANCELLED = "cancelled"


class InvoiceType(StrEnum):
    STANDARD = "standard"
    RECURRING_TEMPLATE = "recurring_template"


class CreditNoteStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    POSTED = "posted"
    APPLIED = "applied"
    VOIDED = "voided"


class PaymentStatus(StrEnum):
    DRAFT = "draft"
    POSTED = "posted"
    VOIDED = "voided"
