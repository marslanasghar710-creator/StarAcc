from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.core.enums import AccountType, NormalBalance

ZERO = Decimal("0")


def natural_amount(account_type: AccountType, debit_total: Decimal, credit_total: Decimal) -> Decimal:
    if account_type in {AccountType.ASSET, AccountType.EXPENSE}:
        return debit_total - credit_total
    return credit_total - debit_total


def raw_net_amount(debit_total: Decimal, credit_total: Decimal) -> Decimal:
    return debit_total - credit_total


def bucket_name(as_of_date: date, due_date: date) -> str:
    days_past_due = (as_of_date - due_date).days
    if days_past_due <= 0:
        return "current"
    if days_past_due <= 30:
        return "1_30_days"
    if days_past_due <= 60:
        return "31_60_days"
    if days_past_due <= 90:
        return "61_90_days"
    return "over_90_days"


def fiscal_year_start(as_of_date: date, start_month: int, start_day: int) -> date:
    tentative = date(as_of_date.year, start_month, start_day)
    if tentative <= as_of_date:
        return tentative
    return date(as_of_date.year - 1, start_month, start_day)


def naturalize_balance(normal_balance: NormalBalance, raw_net: Decimal) -> Decimal:
    if normal_balance == NormalBalance.DEBIT:
        return raw_net
    return -raw_net
