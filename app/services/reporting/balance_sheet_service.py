from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import AccountType, ReportType
from app.repositories.report_repository import ReportRepository
from app.schemas.reporting import (
    BalanceSheetAccountLineResponse,
    BalanceSheetResponse,
    BalanceSheetSectionResponse,
    ReportFilterResponse,
    ReportMetadataResponse,
)
from app.services.reporting.common import fiscal_year_start, natural_amount
from app.services.reporting.report_context_service import ReportContextService

ZERO = Decimal("0")


class BalanceSheetService:
    def __init__(self, db: Session):
        self.db = db
        self.reports = ReportRepository(db)
        self.contexts = ReportContextService(db)

    def generate(self, organization_id: str, query, generated_by_user_id: str | None) -> BalanceSheetResponse:
        filters = query.model_dump(mode="json")
        context = self.contexts.build_context(
            report_type=ReportType.BALANCE_SHEET,
            organization_id=organization_id,
            generated_by_user_id=generated_by_user_id,
            accounting_basis=query.accounting_basis,
            filters=filters,
        )
        organization = self.reports.get_organization(organization_id)
        rows = self.reports.aggregate_account_activity(
            organization_id,
            as_of_date=query.as_of_date,
            account_types=[AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY],
        )
        assets = []
        liabilities = []
        equity = []
        for row in rows:
            amount = natural_amount(row["account_type"], row["debit_total"], row["credit_total"])
            line = BalanceSheetAccountLineResponse(account_id=row["account_id"], code=row["code"], name=row["name"], amount=amount)
            if row["account_type"] == AccountType.ASSET:
                assets.append(line)
            elif row["account_type"] == AccountType.LIABILITY:
                liabilities.append(line)
            else:
                equity.append(line)

        current_year_start = fiscal_year_start(query.as_of_date, organization.fiscal_year_start_month, organization.fiscal_year_start_day)
        current_earnings_rows = self.reports.aggregate_account_activity(
            organization_id,
            from_date=current_year_start,
            to_date=query.as_of_date,
            account_types=[AccountType.REVENUE, AccountType.EXPENSE],
        )
        current_earnings = sum(
            (natural_amount(row["account_type"], row["debit_total"], row["credit_total"]) if row["account_type"] == AccountType.REVENUE else -natural_amount(row["account_type"], row["debit_total"], row["credit_total"]) for row in current_earnings_rows),
            ZERO,
        )
        if current_earnings != ZERO:
            equity.append(BalanceSheetAccountLineResponse(name="Current Earnings", amount=current_earnings, is_computed=True))

        asset_total = sum((line.amount for line in assets), ZERO)
        liability_total = sum((line.amount for line in liabilities), ZERO)
        equity_total = sum((line.amount for line in equity), ZERO)
        result = BalanceSheetResponse(
            metadata=ReportMetadataResponse(
                report_type=ReportType.BALANCE_SHEET,
                organization_id=context.organization_id,
                organization_name=context.organization_name,
                base_currency=context.base_currency,
                generated_at=context.generated_at,
                generated_by_user_id=context.generated_by_user_id,
                accounting_basis=context.accounting_basis,
            ),
            filters=ReportFilterResponse(**filters),
            assets=BalanceSheetSectionResponse(title="Assets", lines=assets, total=asset_total),
            liabilities=BalanceSheetSectionResponse(title="Liabilities", lines=liabilities, total=liability_total),
            equity=BalanceSheetSectionResponse(title="Equity", lines=equity, total=equity_total),
            total_assets=asset_total,
            total_liabilities_and_equity=liability_total + equity_total,
            balances=asset_total == liability_total + equity_total,
        )
        self.contexts.persist_generation(context=context, row_count=len(assets) + len(liabilities) + len(equity))
        self.db.commit()
        return result
