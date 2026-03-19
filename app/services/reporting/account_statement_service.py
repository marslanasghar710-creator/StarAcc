from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.enums import ReportType
from app.core.exceptions import not_found
from app.repositories.report_repository import ReportRepository
from app.schemas.reporting import AccountStatementLineResponse, AccountStatementResponse, ReportFilterResponse, ReportMetadataResponse
from app.services.reporting.general_ledger_service import GeneralLedgerService
from app.services.reporting.report_context_service import ReportContextService


class AccountStatementService:
    def __init__(self, db: Session):
        self.db = db
        self.reports = ReportRepository(db)
        self.contexts = ReportContextService(db)
        self.ledger = GeneralLedgerService(db)

    def generate(self, organization_id: str, account_id: str, query, generated_by_user_id: str | None) -> AccountStatementResponse:
        account = next((item for item in self.reports.list_accounts(organization_id) if str(item.id) == str(account_id)), None)
        if not account:
            raise not_found("Account not found")
        filters = {**query.model_dump(mode="json"), "account_id": str(account.id)}
        context = self.contexts.build_context(
            report_type=ReportType.ACCOUNT_STATEMENT,
            organization_id=organization_id,
            generated_by_user_id=generated_by_user_id,
            accounting_basis=query.accounting_basis,
            filters=filters,
        )
        section = self.ledger._build_sections(organization_id, query.from_date, query.to_date, account_id=account.id, source_module=query.source_module)
        if section:
            account_section = section[0]
        else:
            account_section = None
        lines = []
        opening_balance = movement_total = closing_balance = 0
        if account_section:
            lines = [AccountStatementLineResponse(**line.model_dump()) for line in account_section.lines]
            opening_balance = account_section.opening_balance
            movement_total = account_section.movement_total
            closing_balance = account_section.closing_balance
        result = AccountStatementResponse(
            metadata=ReportMetadataResponse(
                report_type=ReportType.ACCOUNT_STATEMENT,
                organization_id=context.organization_id,
                organization_name=context.organization_name,
                base_currency=context.base_currency,
                generated_at=context.generated_at,
                generated_by_user_id=context.generated_by_user_id,
                accounting_basis=context.accounting_basis,
            ),
            filters=ReportFilterResponse(**filters),
            account_id=account.id,
            account_code=account.code,
            account_name=account.name,
            normal_balance=account.normal_balance.value,
            opening_balance=opening_balance,
            movement_total=movement_total,
            closing_balance=closing_balance,
            lines=lines,
        )
        self.contexts.persist_generation(context=context, row_count=len(lines))
        self.db.commit()
        return result
