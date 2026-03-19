from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import AccountType, ReportType
from app.repositories.report_repository import ReportRepository
from app.schemas.reporting import (
    ProfitLossAccountLineResponse,
    ProfitLossComparisonResponse,
    ProfitLossResponse,
    ProfitLossSectionResponse,
    ReportFilterResponse,
    ReportMetadataResponse,
)
from app.services.reporting.common import natural_amount
from app.services.reporting.report_context_service import ReportContextService

ZERO = Decimal("0")


class ProfitLossService:
    def __init__(self, db: Session):
        self.db = db
        self.reports = ReportRepository(db)
        self.contexts = ReportContextService(db)

    def generate(self, organization_id: str, query, generated_by_user_id: str | None) -> ProfitLossResponse:
        filters = query.model_dump(mode="json")
        context = self.contexts.build_context(
            report_type=ReportType.PROFIT_LOSS,
            organization_id=organization_id,
            generated_by_user_id=generated_by_user_id,
            accounting_basis=query.accounting_basis,
            filters=filters,
        )
        rows = self.reports.aggregate_account_activity(
            organization_id,
            from_date=query.from_date,
            to_date=query.to_date,
            account_types=[AccountType.REVENUE, AccountType.EXPENSE],
        )
        revenue_lines = []
        expense_lines = []
        for row in rows:
            amount = natural_amount(row["account_type"], row["debit_total"], row["credit_total"])
            line = ProfitLossAccountLineResponse(account_id=row["account_id"], code=row["code"], name=row["name"], amount=amount)
            if row["account_type"] == AccountType.REVENUE:
                revenue_lines.append(line)
            else:
                expense_lines.append(line)
        revenue_total = sum((line.amount for line in revenue_lines), ZERO)
        expense_total = sum((line.amount for line in expense_lines), ZERO)
        comparison = None
        if query.compare_from_date and query.compare_to_date:
            comparison_rows = self.reports.aggregate_account_activity(
                organization_id,
                from_date=query.compare_from_date,
                to_date=query.compare_to_date,
                account_types=[AccountType.REVENUE, AccountType.EXPENSE],
            )
            comparison_revenue = sum(
                (natural_amount(row["account_type"], row["debit_total"], row["credit_total"]) for row in comparison_rows if row["account_type"] == AccountType.REVENUE),
                ZERO,
            )
            comparison_expense = sum(
                (natural_amount(row["account_type"], row["debit_total"], row["credit_total"]) for row in comparison_rows if row["account_type"] == AccountType.EXPENSE),
                ZERO,
            )
            comparison = ProfitLossComparisonResponse(
                revenue_total=comparison_revenue,
                expense_total=comparison_expense,
                net_profit=comparison_revenue - comparison_expense,
            )
        result = ProfitLossResponse(
            metadata=ReportMetadataResponse(
                report_type=ReportType.PROFIT_LOSS,
                organization_id=context.organization_id,
                organization_name=context.organization_name,
                base_currency=context.base_currency,
                generated_at=context.generated_at,
                generated_by_user_id=context.generated_by_user_id,
                accounting_basis=context.accounting_basis,
            ),
            filters=ReportFilterResponse(**filters),
            revenue=ProfitLossSectionResponse(title="Revenue", lines=revenue_lines, subtotal=revenue_total),
            expenses=ProfitLossSectionResponse(title="Expenses", lines=expense_lines, subtotal=expense_total),
            net_profit=revenue_total - expense_total,
            comparison=comparison,
        )
        self.contexts.persist_generation(context=context, row_count=len(revenue_lines) + len(expense_lines))
        self.db.commit()
        return result
