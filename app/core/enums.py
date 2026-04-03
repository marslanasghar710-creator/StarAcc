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
    CUSTOM_REPORT = "custom_report"


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


class FileStorageProvider(StrEnum):
    LOCAL = "local"
    S3_SCAFFOLD = "s3_scaffold"
    GCS_SCAFFOLD = "gcs_scaffold"


class FileStatus(StrEnum):
    ACTIVE = "active"
    DELETED = "deleted"
    QUARANTINED_SCAFFOLD = "quarantined_scaffold"


class EmailTemplateType(StrEnum):
    INVOICE_SEND = "invoice_send"
    INVOICE_REMINDER = "invoice_reminder"
    PAYMENT_RECEIPT = "payment_receipt"
    REPORT_EXPORT = "report_export"
    GENERIC_NOTIFICATION = "generic_notification"


class EmailStatus(StrEnum):
    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NotificationType(StrEnum):
    INVOICE_SENT = "invoice_sent"
    PAYMENT_RECEIVED = "payment_received"
    BANK_IMPORT_COMPLETED = "bank_import_completed"
    RECONCILIATION_NEEDED = "reconciliation_needed"
    REPORT_EXPORT_READY = "report_export_ready"
    GENERIC = "generic"


class InventoryCostingMethod(StrEnum):
    WEIGHTED_AVERAGE = "weighted_average"


class InventoryMovementType(StrEnum):
    OPENING = "opening"
    PURCHASE = "purchase"
    SALE = "sale"
    ADJUSTMENT_IN = "adjustment_in"
    ADJUSTMENT_OUT = "adjustment_out"
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT = "transfer_out"
    REVERSAL = "reversal"


class InventorySourceEntityType(StrEnum):
    OPENING_STOCK = "opening_stock"
    BILL = "bill"
    INVOICE = "invoice"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    MANUAL = "manual"


class InventoryAdjustmentType(StrEnum):
    OPENING_STOCK = "opening_stock"
    QUANTITY_WRITE_UP = "quantity_write_up"
    QUANTITY_WRITE_DOWN = "quantity_write_down"


class InventoryValuationMethod(StrEnum):
    WEIGHTED_AVERAGE = "weighted_average"


class ProjectStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EmployeeStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"


class EmploymentType(StrEnum):
    SALARIED = "salaried"
    HOURLY = "hourly"
    CONTRACTOR_SCAFFOLD = "contractor_scaffold"


class PayrollPeriodStatus(StrEnum):
    DRAFT = "draft"
    PROCESSED = "processed"
    POSTED = "posted"


class PayrollRunStatus(StrEnum):
    DRAFT = "draft"
    CALCULATED = "calculated"
    POSTED = "posted"


class PayrollLineItemType(StrEnum):
    EARNING = "earning"
    DEDUCTION = "deduction"
    EMPLOYER_COST = "employer_cost"


class PayrollEarningAmountType(StrEnum):
    FIXED = "fixed"
    HOURLY = "hourly"
    MANUAL = "manual"


class AutomationRuleType(StrEnum):
    BANK_TRANSACTION_CATEGORIZATION = "bank_transaction_categorization"
    DOCUMENT_ROUTING = "document_routing"
    ACCOUNT_CODING = "account_coding"
    TAX_TREATMENT = "tax_treatment"
    PAYABLE_TAGGING = "payable_tagging"
    RECEIVABLE_TAGGING = "receivable_tagging"


class SuggestionStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    APPLIED = "applied"


class SuggestionSourceType(StrEnum):
    RULE = "rule"
    MODEL = "model"
    HYBRID = "hybrid"
    HEURISTIC = "heuristic"


class SuggestionFeedbackAction(StrEnum):
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    IGNORED = "ignored"


class DocumentExtractionStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class DocumentClassifierLabel(StrEnum):
    INVOICE = "invoice"
    BILL = "bill"
    RECEIPT = "receipt"
    STATEMENT = "statement"
    UNKNOWN = "unknown"


class AIJobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"


class AIJobType(StrEnum):
    DOCUMENT_EXTRACTION = "document_extraction"
    RECONCILIATION_SUGGESTIONS = "reconciliation_suggestions"
    CODING_SUGGESTIONS = "coding_suggestions"
    ANOMALY_SCAN = "anomaly_scan"


class OnboardingPath(StrEnum):
    EXPLORE_DEMO = "explore_demo"
    SETUP_REAL = "setup_real"
    EXPERT_SKIP = "expert_skip"


class OnboardingPersona(StrEnum):
    BUSINESS_OWNER = "business_owner"
    ACCOUNTANT = "accountant"
    FINANCE_MANAGER = "finance_manager"
    OPERATOR_ADMIN = "operator_admin"
    EXPLORING = "exploring"


class OnboardingTaskStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class BillingAccountStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CLOSED = "closed"


class BillingInterval(StrEnum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class SubscriptionStatus(StrEnum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    EXPIRED = "expired"


class BillingScopeType(StrEnum):
    ORGANIZATION = "organization"
    GROUP = "group"
    ENTERPRISE = "enterprise"


class EntitlementValueType(StrEnum):
    BOOLEAN = "boolean"
    LIMIT = "limit"


class IntegrationAuthType(StrEnum):
    OAUTH2 = "oauth2"
    API_KEY = "api_key"
    WEBHOOK_SECRET = "webhook_secret"
    NONE = "none"


class IntegrationConnectionStatus(StrEnum):
    CONNECTING = "connecting"
    CONNECTED = "connected"
    REQUIRES_REAUTH = "requires_reauth"
    SYNC_PENDING = "sync_pending"
    SYNCING = "syncing"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILED = "failed"
    DISCONNECTED = "disconnected"
    ARCHIVED = "archived"


class IntegrationSyncDirection(StrEnum):
    PULL = "pull"
    PUSH = "push"
    BIDIRECTIONAL = "bidirectional"


class IntegrationSyncStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    PARTIAL = "partial"
    FAILED = "failed"


class IntegrationSyncType(StrEnum):
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    WEBHOOK = "webhook"
    BACKFILL = "backfill"


class IntegrationCredentialStatus(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
