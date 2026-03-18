from decimal import Decimal

from app.core.enums import JournalStatus, PeriodStatus
from app.core.exceptions import forbidden


class JournalValidationService:
    @staticmethod
    def validate_lines(lines):
        if len(lines) < 2:
            raise forbidden("Journal requires at least 2 lines")
        debit = Decimal("0")
        credit = Decimal("0")
        for line in lines:
            if line.debit_amount > 0 and line.credit_amount > 0:
                raise forbidden("Line cannot contain both debit and credit")
            if line.debit_amount <= 0 and line.credit_amount <= 0:
                raise forbidden("Line requires a debit or credit amount")
            debit += Decimal(line.debit_amount)
            credit += Decimal(line.credit_amount)
        if debit != credit:
            raise forbidden("Journal must be balanced")

    @staticmethod
    def validate_editable(status):
        if status != JournalStatus.DRAFT:
            raise forbidden("Only draft journals are editable")

    @staticmethod
    def validate_period_open(period):
        if period.status in {PeriodStatus.CLOSED, PeriodStatus.LOCKED}:
            raise forbidden("Cannot post in closed or locked period")
