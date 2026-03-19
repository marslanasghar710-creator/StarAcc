from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.core.enums import (
    PricesEnteredAre,
    TaxCalculationMethod,
    TaxCodeAppliesTo,
    TaxPriceInclusiveBehavior,
)
from app.core.exceptions import forbidden, not_found
from app.repositories.tax_code_repository import TaxCodeRepository
from app.repositories.tax_rate_repository import TaxRateRepository
from app.services.tax_settings_service import TaxSettingsService

TWOPLACES = Decimal("0.01")
ZERO = Decimal("0")


@dataclass(slots=True)
class TaxLineCalculation:
    taxable_amount: Decimal
    tax_amount: Decimal
    gross_amount: Decimal
    effective_tax_rate: Decimal
    tax_breakdown: dict | None
    tax_inclusive: bool


class TaxCalculationService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = TaxSettingsService(db)
        self.codes = TaxCodeRepository(db)
        self.rates = TaxRateRepository(db)

    def _round(self, value: Decimal) -> Decimal:
        return Decimal(value).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

    def resolve_code(self, organization_id, tax_code_id, usage: TaxCodeAppliesTo):
        if tax_code_id is None:
            return None, []
        code = self.codes.get(organization_id, tax_code_id)
        if not code:
            raise not_found("Tax code not found")
        if not code.is_active:
            raise forbidden("Inactive tax code cannot be used")
        if usage == TaxCodeAppliesTo.SALES and code.applies_to not in {TaxCodeAppliesTo.SALES, TaxCodeAppliesTo.BOTH}:
            raise forbidden("Tax code does not apply to sales")
        if usage == TaxCodeAppliesTo.PURCHASES and code.applies_to not in {TaxCodeAppliesTo.PURCHASES, TaxCodeAppliesTo.BOTH}:
            raise forbidden("Tax code does not apply to purchases")
        components = self.codes.list_components(code.id)
        return code, components

    def resolve_price_inclusive(self, settings, price_mode: TaxPriceInclusiveBehavior, code) -> bool:
        if price_mode == TaxPriceInclusiveBehavior.INCLUSIVE:
            return True
        if price_mode == TaxPriceInclusiveBehavior.EXCLUSIVE:
            return False
        behavior = code.price_inclusive_behavior if code else TaxPriceInclusiveBehavior.INHERIT_ORGANIZATION_DEFAULT
        if behavior == TaxPriceInclusiveBehavior.INCLUSIVE:
            return True
        if behavior == TaxPriceInclusiveBehavior.EXCLUSIVE:
            return False
        return settings.prices_entered_are == PricesEnteredAre.INCLUSIVE

    def calculate_line(self, organization_id, *, quantity, unit_price, discount_percent=None, discount_amount=None, tax_code_id=None, price_mode=TaxPriceInclusiveBehavior.INHERIT_ORGANIZATION_DEFAULT, usage=TaxCodeAppliesTo.BOTH):
        settings = self.settings.get_or_create(organization_id)
        base_amount = Decimal(quantity) * Decimal(unit_price)
        if discount_percent is not None:
            base_amount -= base_amount * (Decimal(discount_percent) / Decimal("100"))
        if discount_amount is not None:
            base_amount -= Decimal(discount_amount)
        if base_amount < ZERO:
            raise forbidden("Discounts cannot exceed line value")
        code, components = self.resolve_code(organization_id, tax_code_id, usage)
        inclusive = self.resolve_price_inclusive(settings, price_mode, code)
        if not code or code.calculation_method in {TaxCalculationMethod.EXEMPT, TaxCalculationMethod.OUT_OF_SCOPE, TaxCalculationMethod.REVERSE_CHARGE_SCAFFOLD}:
            amount = self._round(base_amount)
            return TaxLineCalculation(amount, ZERO, amount, ZERO, None, inclusive)
        total_rate = ZERO
        breakdown_components = []
        for component in components:
            rate = self.rates.get(organization_id, component.tax_rate_id)
            if component.compound_on_previous:
                raise forbidden("Compound tax is not implemented yet")
            total_rate += Decimal(rate.percentage)
            breakdown_components.append({
                "tax_rate_id": str(rate.id),
                "tax_rate_name": rate.name,
                "tax_rate_code": rate.code,
                "percentage": str(rate.percentage),
                "report_group": rate.report_group,
            })
        if inclusive:
            gross_amount = self._round(base_amount)
            taxable_amount = self._round(gross_amount / (Decimal("1") + (total_rate / Decimal("100")))) if total_rate > ZERO else gross_amount
            tax_amount = self._round(gross_amount - taxable_amount)
        else:
            taxable_amount = self._round(base_amount)
            tax_amount = self._round(taxable_amount * (total_rate / Decimal("100")))
            gross_amount = self._round(taxable_amount + tax_amount)
        return TaxLineCalculation(
            taxable_amount=taxable_amount,
            tax_amount=tax_amount,
            gross_amount=gross_amount,
            effective_tax_rate=total_rate,
            tax_breakdown={"tax_code_id": str(code.id), "tax_code": code.code, "tax_code_name": code.name, "components": breakdown_components} if code else None,
            tax_inclusive=inclusive,
        )

    def calculate_preview(self, organization_id, payload):
        settings = self.settings.get_or_create(organization_id)
        lines = []
        subtotal = tax_total = grand_total = ZERO
        for line in payload.lines:
            result = self.calculate_line(
                organization_id,
                quantity=line.quantity,
                unit_price=line.unit_price,
                discount_percent=line.discount_percent,
                discount_amount=line.discount_amount,
                tax_code_id=line.tax_code_id,
                price_mode=line.price_mode,
                usage=line.usage,
            )
            lines.append({
                "description": line.description,
                "quantity": line.quantity,
                "unit_price": line.unit_price,
                "discount_percent": line.discount_percent,
                "discount_amount": line.discount_amount,
                "tax_code_id": line.tax_code_id,
                "taxable_amount": result.taxable_amount,
                "tax_amount": result.tax_amount,
                "gross_amount": result.gross_amount,
                "effective_tax_rate": result.effective_tax_rate,
                "tax_breakdown": result.tax_breakdown,
                "tax_inclusive": result.tax_inclusive,
            })
            subtotal += result.taxable_amount
            tax_total += result.tax_amount
            grand_total += result.gross_amount
        return {
            "lines": lines,
            "subtotal_amount": subtotal,
            "tax_amount": tax_total,
            "total_amount": grand_total,
            "prices_entered_are": settings.prices_entered_are,
            "tax_rounding_method": settings.tax_rounding_method,
        }
