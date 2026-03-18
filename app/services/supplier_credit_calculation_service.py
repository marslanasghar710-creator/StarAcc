from decimal import Decimal


class SupplierCreditCalculationService:
    @staticmethod
    def calculate_line(quantity, unit_price, line_tax_amount=Decimal("0")):
        subtotal = Decimal(quantity) * Decimal(unit_price)
        tax = Decimal(line_tax_amount or 0)
        total = subtotal + tax
        return subtotal, tax, total

    @staticmethod
    def calculate_header(lines):
        subtotal = sum((Decimal(l.line_subtotal) for l in lines), Decimal("0"))
        tax = sum((Decimal(l.line_tax_amount) for l in lines), Decimal("0"))
        total = sum((Decimal(l.line_total) for l in lines), Decimal("0"))
        return subtotal, tax, total
