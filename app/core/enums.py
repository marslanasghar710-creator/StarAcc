try:
    from enum import StrEnum
except ImportError:  # pragma: no cover - Python < 3.11 compatibility
    from enum import Enum

    class StrEnum(str, Enum):
        pass


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


class BillStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    POSTED = "posted"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    VOIDED = "voided"
    CANCELLED = "cancelled"


class BillType(StrEnum):
    STANDARD = "standard"
    RECURRING_TEMPLATE = "recurring_template"


class SupplierCreditStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    POSTED = "posted"
    APPLIED = "applied"
    VOIDED = "voided"


class BankTransactionType(StrEnum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    FEE = "fee"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"


class BankTransactionStatus(StrEnum):
    UNRECONCILED = "unreconciled"
    RECONCILED = "reconciled"


class ReportType(StrEnum):
    PROFIT_LOSS = "profit_loss"
    BALANCE_SHEET = "balance_sheet"
    TRIAL_BALANCE = "trial_balance"
    GENERAL_LEDGER = "general_ledger"
    ACCOUNT_STATEMENT = "account_statement"
    AGED_RECEIVABLES = "aged_receivables"
    AGED_PAYABLES = "aged_payables"


class ReportExportFormat(StrEnum):
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"


class ReportRunStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class TaxBasis(StrEnum):
    ACCRUAL = "accrual"
    CASH_SCAFFOLD = "cash_scaffold"


class PricesEnteredAre(StrEnum):
    EXCLUSIVE = "exclusive"
    INCLUSIVE = "inclusive"
    EITHER = "either"


class TaxRoundingMethod(StrEnum):
    LINE = "line"
    DOCUMENT = "document"


class TaxPeriodicity(StrEnum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"
    NONE = "none"


class TaxType(StrEnum):
    STANDARD = "standard"
    REDUCED = "reduced"
    ZERO = "zero"
    EXEMPT = "exempt"
    OUT_OF_SCOPE = "out_of_scope"
    REVERSE_CHARGE_SCAFFOLD = "reverse_charge_scaffold"


class TaxScope(StrEnum):
    SALES = "sales"
    PURCHASES = "purchases"
    BOTH = "both"


class TaxCodeAppliesTo(StrEnum):
    SALES = "sales"
    PURCHASES = "purchases"
    BOTH = "both"


class TaxCalculationMethod(StrEnum):
    PERCENTAGE = "percentage"
    EXEMPT = "exempt"
    OUT_OF_SCOPE = "out_of_scope"
    REVERSE_CHARGE_SCAFFOLD = "reverse_charge_scaffold"


class TaxPriceInclusiveBehavior(StrEnum):
    EXCLUSIVE = "exclusive"
    INCLUSIVE = "inclusive"
    INHERIT_ORGANIZATION_DEFAULT = "inherit_organization_default"


class TaxTransactionDirection(StrEnum):
    OUTPUT = "output"
    INPUT = "input"
    NEUTRAL = "neutral"
