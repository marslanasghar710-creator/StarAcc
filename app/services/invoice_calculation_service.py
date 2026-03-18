from decimal import Decimal


class InvoiceCalculationService:
    @staticmethod
    def calculate_line(quantity, unit_price, discount_percent=None, discount_amount=None, line_tax_amount=Decimal("0")):
        subtotal = Decimal(quantity) * Decimal(unit_price)
        if discount_percent:
            subtotal -= subtotal * (Decimal(discount_percent) / Decimal("100"))
        if discount_amount:
            subtotal -= Decimal(discount_amount)
        subtotal = max(subtotal, Decimal("0"))
        tax = Decimal(line_tax_amount or 0)
        total = subtotal + tax
        return subtotal, tax, total

    @staticmethod
    def calculate_header(lines):
        subtotal = sum((Decimal(l.line_subtotal) for l in lines), Decimal("0"))
        tax = sum((Decimal(l.line_tax_amount) for l in lines), Decimal("0"))
        total = sum((Decimal(l.line_total) for l in lines), Decimal("0"))
        return subtotal, Decimal("0"), tax, total
