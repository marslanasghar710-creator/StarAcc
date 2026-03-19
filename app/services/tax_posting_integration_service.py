from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import TaxTransactionDirection
from app.core.exceptions import forbidden
from app.repositories.tax_transaction_repository import TaxTransactionRepository
from app.services.tax_settings_service import TaxSettingsService

ZERO = Decimal("0")


class TaxPostingIntegrationService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = TaxSettingsService(db)
        self.transactions = TaxTransactionRepository(db)

    def control_account_id(self, organization_id, direction: TaxTransactionDirection, tax_amount: Decimal):
        if Decimal(tax_amount) == ZERO:
            return None
        settings = self.settings.get_or_create(organization_id)
        if direction == TaxTransactionDirection.OUTPUT:
            if not settings.default_output_tax_account_id:
                raise forbidden("Output tax account is not configured")
            return settings.default_output_tax_account_id
        if direction == TaxTransactionDirection.INPUT:
            if not settings.default_input_tax_account_id:
                raise forbidden("Input tax account is not configured")
            return settings.default_input_tax_account_id
        return None

    def create_transactions(self, *, organization_id, source_module, source_type, source_id, journal_entry_id, transaction_date, currency_code, direction: TaxTransactionDirection, tax_account_id, lines, sign: Decimal = Decimal("1")):
        for line in lines:
            tax_amount = Decimal(getattr(line, "line_tax_amount", ZERO) or ZERO)
            net_amount = Decimal(getattr(line, "line_taxable_amount", getattr(line, "line_subtotal", ZERO)) or ZERO)
            gross_amount = Decimal(getattr(line, "line_total", ZERO) or ZERO)
            if tax_amount == ZERO and not getattr(line, "tax_code_id", None):
                continue
            breakdown = getattr(line, "tax_breakdown_json", None) or {}
            component = (breakdown.get("components") or [{}])[0]
            self.transactions.create(
                organization_id=organization_id,
                source_module=source_module,
                source_type=source_type,
                source_id=str(source_id),
                source_line_id=str(line.id),
                journal_entry_id=journal_entry_id,
                transaction_date=transaction_date,
                tax_code_id=getattr(line, "tax_code_id", None),
                tax_rate_name_snapshot=component.get("tax_rate_name"),
                tax_rate_percentage_snapshot=component.get("percentage"),
                report_group=component.get("report_group") or breakdown.get("report_group"),
                direction=direction,
                net_amount=net_amount * sign,
                tax_amount=tax_amount * sign,
                gross_amount=gross_amount * sign,
                currency_code=currency_code,
                tax_account_id=tax_account_id,
                tax_breakdown_json=breakdown,
            )
