from __future__ import annotations

from collections import OrderedDict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import ReportType
from app.repositories.report_repository import ReportRepository
from app.schemas.reporting import (
    GeneralLedgerAccountSectionResponse,
    GeneralLedgerLineResponse,
    GeneralLedgerResponse,
    ReportFilterResponse,
    ReportMetadataResponse,
)
from app.services.reporting.common import naturalize_balance, raw_net_amount
from app.services.reporting.report_context_service import ReportContextService

ZERO = Decimal("0")


class GeneralLedgerService:
    def __init__(self, db: Session):
        self.db = db
        self.reports = ReportRepository(db)
        self.contexts = ReportContextService(db)

    def _build_sections(self, organization_id: str, from_date, to_date, account_id=None, source_module=None):
        rows = self.reports.fetch_general_ledger_rows(organization_id, from_date, to_date, account_id=account_id, source_module=source_module)
        sections: OrderedDict[str, GeneralLedgerAccountSectionResponse] = OrderedDict()
        running_balances: dict[str, Decimal] = {}
        for row in rows:
            key = str(row.account.id)
            if key not in sections:
                opening_raw_net = self.reports.opening_net_movement(organization_id, row.account.id, from_date)
                opening_balance = naturalize_balance(row.account.normal_balance, opening_raw_net)
                sections[key] = GeneralLedgerAccountSectionResponse(
                    account_id=row.account.id,
                    account_code=row.account.code,
                    account_name=row.account.name,
                    normal_balance=row.account.normal_balance.value,
                    opening_balance=opening_balance,
                    movement_total=ZERO,
                    closing_balance=opening_balance,
                    lines=[],
                )
                running_balances[key] = opening_balance
            movement_raw_net = raw_net_amount(Decimal(row.journal_line.base_debit_amount), Decimal(row.journal_line.base_credit_amount))
            movement = naturalize_balance(row.account.normal_balance, movement_raw_net)
            running_balances[key] += movement
            sections[key].movement_total += movement
            sections[key].closing_balance = running_balances[key]
            sections[key].lines.append(
                GeneralLedgerLineResponse(
                    journal_id=row.journal_entry.id,
                    journal_line_id=row.journal_line.id,
                    entry_date=row.journal_entry.entry_date,
                    entry_number=row.journal_entry.entry_number,
                    source_module=row.journal_entry.source_module,
                    source_type=row.journal_entry.source_type,
                    source_id=row.journal_entry.source_id,
                    description=row.journal_line.description or row.journal_entry.description,
                    debit=Decimal(row.journal_line.base_debit_amount),
                    credit=Decimal(row.journal_line.base_credit_amount),
                    running_balance=running_balances[key],
                )
            )
        return list(sections.values())

    def generate(self, organization_id: str, query, generated_by_user_id: str | None) -> GeneralLedgerResponse:
        filters = query.model_dump(mode="json")
        context = self.contexts.build_context(
            report_type=ReportType.GENERAL_LEDGER,
            organization_id=organization_id,
            generated_by_user_id=generated_by_user_id,
            accounting_basis=query.accounting_basis,
            filters=filters,
        )
        accounts = self._build_sections(organization_id, query.from_date, query.to_date, account_id=query.account_id, source_module=query.source_module)
        result = GeneralLedgerResponse(
            metadata=ReportMetadataResponse(
                report_type=ReportType.GENERAL_LEDGER,
                organization_id=context.organization_id,
                organization_name=context.organization_name,
                base_currency=context.base_currency,
                generated_at=context.generated_at,
                generated_by_user_id=context.generated_by_user_id,
                accounting_basis=context.accounting_basis,
            ),
            filters=ReportFilterResponse(**filters),
            accounts=accounts,
        )
        row_count = sum(len(account.lines) for account in accounts)
        self.contexts.persist_generation(context=context, row_count=row_count)
        self.db.commit()
        return result
