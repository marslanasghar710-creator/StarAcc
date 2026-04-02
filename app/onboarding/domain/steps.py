from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class OnboardingTaskDefinition:
    key: str
    title: str
    description: str
    stage: str
    required: bool
    permissions: tuple[str, ...]
    depends_on: tuple[str, ...] = ()
    route: str | None = None


TASK_DEFINITIONS: tuple[OnboardingTaskDefinition, ...] = (
    OnboardingTaskDefinition(
        key="set-company-details",
        title="Set company details",
        description="Confirm legal name, timezone, and organization profile details.",
        stage="stage_1_valid",
        required=True,
        permissions=("org.update",),
        route="/settings/organization",
    ),
    OnboardingTaskDefinition(
        key="confirm-fiscal-year",
        title="Confirm fiscal year",
        description="Make sure fiscal start month/day are correct for statutory reporting.",
        stage="stage_1_valid",
        required=True,
        permissions=("settings.update",),
        route="/settings/fiscal-periods",
    ),
    OnboardingTaskDefinition(
        key="setup-chart-of-accounts",
        title="Set up chart of accounts",
        description="Ensure foundational accounts exist before posting transactions.",
        stage="stage_1_valid",
        required=True,
        permissions=("accounts.read",),
        route="/accounts",
    ),
    OnboardingTaskDefinition(
        key="configure-tax",
        title="Configure tax defaults",
        description="Set tax behavior and core codes for compliant invoicing and bills.",
        stage="stage_1_valid",
        required=True,
        permissions=("tax.read",),
        route="/settings/tax",
    ),
    OnboardingTaskDefinition(
        key="add-bank-account",
        title="Add bank account",
        description="Connect or create a bank account for cash workflow visibility.",
        stage="stage_2_operational",
        required=True,
        permissions=("banking.read",),
        route="/banking",
    ),
    OnboardingTaskDefinition(
        key="add-first-counterparty",
        title="Add first customer or supplier",
        description="Create at least one customer or supplier to start AP/AR activity.",
        stage="stage_2_operational",
        required=False,
        permissions=("customers.read", "suppliers.read"),
        route="/customers",
    ),
    OnboardingTaskDefinition(
        key="create-first-transaction",
        title="Create first invoice, bill, or journal",
        description="Record your first accounting transaction to activate reporting.",
        stage="stage_2_operational",
        required=True,
        permissions=("invoices.read", "bills.read", "journals.read"),
        depends_on=("add-bank-account",),
        route="/invoices/new",
    ),
    OnboardingTaskDefinition(
        key="view-first-report",
        title="View first financial report",
        description="Open P&L or Balance Sheet to confirm books are flowing.",
        stage="stage_3_insightful",
        required=True,
        permissions=("reports.read",),
        depends_on=("create-first-transaction",),
        route="/reports/profit-loss",
    ),
    OnboardingTaskDefinition(
        key="run-first-export",
        title="Run first export",
        description="Generate an external output (PDF/CSV) to validate reporting portability.",
        stage="stage_3_insightful",
        required=False,
        permissions=("reports.read",),
        depends_on=("view-first-report",),
        route="/reports",
    ),
)

PERSONA_PRIORITIES: dict[str, tuple[str, ...]] = {
    "business_owner": ("set-company-details", "add-bank-account", "create-first-transaction", "view-first-report"),
    "accountant": ("setup-chart-of-accounts", "configure-tax", "create-first-transaction", "view-first-report"),
    "finance_manager": ("confirm-fiscal-year", "configure-tax", "add-bank-account", "view-first-report"),
    "operator_admin": ("set-company-details", "add-first-counterparty", "create-first-transaction", "view-first-report"),
    "exploring": ("view-first-report", "run-first-export", "add-bank-account"),
}
