from pydantic import BaseModel


class DashboardMetric(BaseModel):
    key: str
    label: str
    value: float
    currency_code: str | None = None
    delta: float | None = None
    route: str


class DashboardAttentionItem(BaseModel):
    key: str
    title: str
    detail: str
    severity: str
    route: str
    count: int | None = None
    amount: float | None = None
    currency_code: str | None = None


class DashboardTrendPoint(BaseModel):
    label: str
    revenue: float
    expenses: float
    cash_movement: float


class DashboardAgingBucket(BaseModel):
    bucket: str
    receivables: float
    payables: float


class DashboardWorkflowStatus(BaseModel):
    key: str
    label: str
    draft: int
    in_progress: int
    overdue: int
    completed: int
    route: str


class DashboardActivityItem(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: str | None = None
    created_at: str


class DashboardRecommendation(BaseModel):
    key: str
    title: str
    description: str
    route: str
    priority: str


class DashboardOverviewResponse(BaseModel):
    maturity: str
    summary_metrics: list[DashboardMetric]
    attention_items: list[DashboardAttentionItem]
    trends: list[DashboardTrendPoint]
    aging: list[DashboardAgingBucket]
    workflows: list[DashboardWorkflowStatus]
    recent_activity: list[DashboardActivityItem]
    recommendations: list[DashboardRecommendation]
