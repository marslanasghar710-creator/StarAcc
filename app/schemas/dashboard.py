from pydantic import BaseModel


class DashboardDrilldownTarget(BaseModel):
    route: str
    params: dict[str, str | int | bool | None] | None = None
    label: str | None = None


class DashboardCta(BaseModel):
    label: str
    route: str
    params: dict[str, str | int | bool | None] | None = None


class DashboardEmptyState(BaseModel):
    kind: str
    title: str
    description: str | None = None
    primaryCta: DashboardCta | None = None


class DashboardWarningState(BaseModel):
    code: str
    title: str
    description: str | None = None


class DashboardErrorState(BaseModel):
    code: str
    title: str
    description: str | None = None
    retryable: bool | None = None


class DashboardMoneyValue(BaseModel):
    amount: str
    formatted: str


class DashboardWidgetEnvelope(BaseModel):
    widgetKey: str
    title: str
    subtitle: str | None = None
    status: str
    priority: str | None = None
    sizeHint: str | None = None
    applicable: bool = True
    hiddenReason: str | None = None
    requiredPermissions: list[str] | None = None
    drilldownTarget: DashboardDrilldownTarget | None = None
    refreshedAt: str | None = None
    payload: dict | None = None
    emptyState: DashboardEmptyState | None = None
    warningState: DashboardWarningState | None = None
    errorState: DashboardErrorState | None = None


class DashboardContext(BaseModel):
    scopeType: str
    scopeId: str
    scopeLabel: str
    periodLabel: str
    maturityState: str
    roleProfile: str
    isDemo: bool


class DashboardSummary(BaseModel):
    generatedAt: str
    currency: str
    timezone: str


class DashboardOverviewResponse(BaseModel):
    organizationId: str
    dashboardContext: DashboardContext
    summary: DashboardSummary
    widgets: list[DashboardWidgetEnvelope]
