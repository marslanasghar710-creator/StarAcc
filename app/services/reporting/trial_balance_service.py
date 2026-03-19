from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import ReportType
from app.repositories.report_repository import ReportRepository
from app.schemas.reporting import ReportFilterResponse, ReportMetadataResponse, TrialBalanceLineResponse, TrialBalanceResponse
from app.services.reporting.common import raw_net_amount
from app.services.reporting.report_context_service import ReportContextService

ZERO = Decimal("0")


class TrialBalanceService:
    def __init__(self, db: Session):
        self.db = db
        self.reports = ReportRepository(db)
        self.contexts = ReportContextService(db)

    def generate(self, organization_id: str, query, generated_by_user_id: str | None) -> TrialBalanceResponse:
        filters = query.model_dump(mode="json")
        context = self.contexts.build_context(
            report_type=ReportType.TRIAL_BALANCE,
            organization_id=organization_id,
            generated_by_user_id=generated_by_user_id,
            accounting_basis=query.accounting_basis,
            filters=filters,
        )
        accounts = self.reports.list_accounts(organization_id)
        amounts = {row["account_id"]: row for row in self.reports.aggregate_account_activity(organization_id, as_of_date=query.as_of_date)}
        lines = []
        total_debit = ZERO
        total_credit = ZERO
        for account in accounts:
            row = amounts.get(account.id)
            raw_net = raw_net_amount(row["debit_total"], row["credit_total"]) if row else ZERO
            debit_balance = raw_net if raw_net > ZERO else ZERO
            credit_balance = -raw_net if raw_net < ZERO else ZERO
            if not query.include_zero_balances and debit_balance == ZERO and credit_balance == ZERO:
                continue
            total_debit += debit_balance
            total_credit += credit_balance
            lines.append(
                TrialBalanceLineResponse(
                    account_id=account.id,
                    code=account.code,
                    name=account.name,
                    debit_balance=debit_balance,
                    credit_balance=credit_balance,
                )
            )
        result = TrialBalanceResponse(
            metadata=ReportMetadataResponse(
                report_type=ReportType.TRIAL_BALANCE,
                organization_id=context.organization_id,
                organization_name=context.organization_name,
                base_currency=context.base_currency,
                generated_at=context.generated_at,
                generated_by_user_id=context.generated_by_user_id,
                accounting_basis=context.accounting_basis,
            ),
            filters=ReportFilterResponse(**filters),
            lines=lines,
            total_debit=total_debit,
            total_credit=total_credit,
            balances=total_debit == total_credit,
        )
        self.contexts.persist_generation(context=context, row_count=len(lines))
        self.db.commit()
        return result
