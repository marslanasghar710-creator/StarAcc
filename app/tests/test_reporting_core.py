from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.enums import AccountType, JournalStatus, MembershipStatus
from app.core.security import create_access_token, hash_password
from app.db.models import (
    Account,
    Bill,
    Customer,
    CustomerPayment,
    FinancialPeriod,
    Invoice,
    JournalEntry,
    JournalLine,
    Organization,
    OrganizationSettings,
    OrganizationUser,
    ReportExport,
    ReportRun,
    Role,
    Supplier,
    SupplierCredit,
    SupplierPayment,
    User,
    UserProfile,
)

UTC = timezone.utc


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def create_user(db, email: str):
    user = User(email=email, password_hash=hash_password("StrongPass123"))
    db.add(user)
    db.flush()
    db.add(UserProfile(user_id=user.id))
    db.flush()
    return user


def create_org_with_membership(db, owner: User, name: str, role_name: str = "owner"):
    org = Organization(name=name, base_currency="USD", fiscal_year_start_month=1, fiscal_year_start_day=1, timezone="UTC")
    db.add(org)
    db.flush()
    db.add(OrganizationSettings(organization_id=org.id))
    role = db.scalar(select(Role).where(Role.name == role_name))
    db.add(
        OrganizationUser(
            user_id=owner.id,
            organization_id=org.id,
            role_id=role.id,
            is_default=True,
            joined_at=datetime.now(UTC),
            status=MembershipStatus.ACTIVE,
        )
    )
    db.flush()
    period = FinancialPeriod(
        organization_id=org.id,
        name="FY26",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        fiscal_year=2026,
        period_number=1,
        status="open",
    )
    db.add(period)
    db.flush()
    return org, period


def add_membership(db, user: User, org: Organization, role_name: str):
    role = db.scalar(select(Role).where(Role.name == role_name))
    db.add(
        OrganizationUser(
            user_id=user.id,
            organization_id=org.id,
            role_id=role.id,
            is_default=False,
            joined_at=datetime.now(UTC),
            status=MembershipStatus.ACTIVE,
        )
    )
    db.flush()


def create_account(db, org: Organization, code: str, name: str, account_type: AccountType):
    normal = "debit" if account_type in {AccountType.ASSET, AccountType.EXPENSE} else "credit"
    account = Account(organization_id=org.id, code=code, name=name, account_type=account_type, normal_balance=normal)
    db.add(account)
    db.flush()
    return account


def create_posted_journal(db, org: Organization, period: FinancialPeriod, creator: User, entry_number: str, entry_date: date, description: str, lines: list[dict], source_module: str | None = None):
    journal = JournalEntry(
        organization_id=org.id,
        entry_number=entry_number,
        entry_date=entry_date,
        description=description,
        source_module=source_module,
        status=JournalStatus.POSTED,
        period_id=period.id,
        created_by_user_id=creator.id,
        posted_by_user_id=creator.id,
        posted_at=datetime.now(UTC),
    )
    db.add(journal)
    db.flush()
    for idx, line in enumerate(lines, start=1):
        db.add(
            JournalLine(
                journal_entry_id=journal.id,
                organization_id=org.id,
                line_number=idx,
                account_id=line["account_id"],
                description=line.get("description"),
                debit_amount=line.get("debit", Decimal("0")),
                credit_amount=line.get("credit", Decimal("0")),
                currency_code="USD",
                exchange_rate=Decimal("1"),
                base_debit_amount=line.get("debit", Decimal("0")),
                base_credit_amount=line.get("credit", Decimal("0")),
                created_at=datetime.now(UTC),
            )
        )
    db.flush()
    return journal


def create_draft_journal(db, org: Organization, period: FinancialPeriod, creator: User, entry_number: str, entry_date: date, description: str, lines: list[dict]):
    journal = JournalEntry(
        organization_id=org.id,
        entry_number=entry_number,
        entry_date=entry_date,
        description=description,
        status=JournalStatus.DRAFT,
        period_id=period.id,
        created_by_user_id=creator.id,
    )
    db.add(journal)
    db.flush()
    for idx, line in enumerate(lines, start=1):
        db.add(
            JournalLine(
                journal_entry_id=journal.id,
                organization_id=org.id,
                line_number=idx,
                account_id=line["account_id"],
                description=line.get("description"),
                debit_amount=line.get("debit", Decimal("0")),
                credit_amount=line.get("credit", Decimal("0")),
                currency_code="USD",
                exchange_rate=Decimal("1"),
                base_debit_amount=line.get("debit", Decimal("0")),
                base_credit_amount=line.get("credit", Decimal("0")),
                created_at=datetime.now(UTC),
            )
        )
    db.flush()
    return journal


def setup_reporting_fixture(db):
    owner = create_user(db, "report-owner@example.com")
    org, period = create_org_with_membership(db, owner, "Reporting Org")
    cash = create_account(db, org, "1000", "Cash", AccountType.ASSET)
    ar = create_account(db, org, "1100", "Accounts Receivable", AccountType.ASSET)
    ap = create_account(db, org, "2000", "Accounts Payable", AccountType.LIABILITY)
    equity = create_account(db, org, "3000", "Owner Equity", AccountType.EQUITY)
    sales = create_account(db, org, "4000", "Sales", AccountType.REVENUE)
    rent = create_account(db, org, "5000", "Rent Expense", AccountType.EXPENSE)
    utilities = create_account(db, org, "5100", "Utilities Expense", AccountType.EXPENSE)

    create_posted_journal(
        db,
        org,
        period,
        owner,
        "JNL-000001",
        date(2026, 1, 2),
        "Capital",
        [
            {"account_id": cash.id, "debit": Decimal("1000.00")},
            {"account_id": equity.id, "credit": Decimal("1000.00")},
        ],
        source_module="general",
    )
    create_posted_journal(
        db,
        org,
        period,
        owner,
        "JNL-000002",
        date(2026, 1, 5),
        "January sale",
        [
            {"account_id": cash.id, "debit": Decimal("500.00")},
            {"account_id": sales.id, "credit": Decimal("500.00")},
        ],
        source_module="ar",
    )
    create_posted_journal(
        db,
        org,
        period,
        owner,
        "JNL-000003",
        date(2026, 1, 8),
        "January rent",
        [
            {"account_id": rent.id, "debit": Decimal("100.00")},
            {"account_id": cash.id, "credit": Decimal("100.00")},
        ],
        source_module="ap",
    )
    create_posted_journal(
        db,
        org,
        period,
        owner,
        "JNL-000004",
        date(2026, 1, 20),
        "January utilities",
        [
            {"account_id": utilities.id, "debit": Decimal("50.00")},
            {"account_id": cash.id, "credit": Decimal("50.00")},
        ],
        source_module="banking",
    )
    create_posted_journal(
        db,
        org,
        period,
        owner,
        "JNL-000005",
        date(2026, 2, 2),
        "February sale",
        [
            {"account_id": ar.id, "debit": Decimal("200.00")},
            {"account_id": sales.id, "credit": Decimal("200.00")},
        ],
        source_module="ar",
    )
    create_posted_journal(
        db,
        org,
        period,
        owner,
        "JNL-000006",
        date(2026, 2, 10),
        "February bill",
        [
            {"account_id": rent.id, "debit": Decimal("80.00")},
            {"account_id": ap.id, "credit": Decimal("80.00")},
        ],
        source_module="ap",
    )
    create_draft_journal(
        db,
        org,
        period,
        owner,
        "JNL-000007",
        date(2026, 1, 15),
        "Draft sale",
        [
            {"account_id": cash.id, "debit": Decimal("999.00")},
            {"account_id": sales.id, "credit": Decimal("999.00")},
        ],
    )
    db.commit()
    return owner, org, {"cash": cash, "ar": ar, "ap": ap, "equity": equity, "sales": sales, "rent": rent, "utilities": utilities}


def test_profit_loss_and_balance_sheet_reports(client, db):
    owner, org, _accounts = setup_reporting_fixture(db)
    token = create_access_token(str(owner.id))

    pnl = client.get(
        f"/organizations/{org.id}/reports/profit-loss",
        headers=auth_header(token),
        params={"from_date": "2026-01-01", "to_date": "2026-01-31", "compare_from_date": "2026-02-01", "compare_to_date": "2026-02-28"},
    )
    assert pnl.status_code == 200
    payload = pnl.json()
    assert Decimal(str(payload["revenue"]["subtotal"])) == Decimal("500.00")
    assert Decimal(str(payload["expenses"]["subtotal"])) == Decimal("150.00")
    assert Decimal(str(payload["net_profit"])) == Decimal("350.00")
    assert Decimal(str(payload["comparison"]["net_profit"])) == Decimal("120.00")

    balance_sheet = client.get(
        f"/organizations/{org.id}/reports/balance-sheet",
        headers=auth_header(token),
        params={"as_of_date": "2026-02-28"},
    )
    assert balance_sheet.status_code == 200
    bs_payload = balance_sheet.json()
    assert Decimal(str(bs_payload["total_assets"])) == Decimal("1470.00")
    assert Decimal(str(bs_payload["total_liabilities_and_equity"])) == Decimal("1470.00")
    assert bs_payload["balances"] is True
    current_earnings = next(line for line in bs_payload["equity"]["lines"] if line["name"] == "Current Earnings")
    assert Decimal(str(current_earnings["amount"])) == Decimal("470.00")


def test_trial_balance_filters_zero_balances_and_balances(client, db):
    owner, org, accounts = setup_reporting_fixture(db)
    token = create_access_token(str(owner.id))
    zero_account = create_account(db, org, "5200", "Unused Expense", AccountType.EXPENSE)
    db.commit()

    response = client.get(
        f"/organizations/{org.id}/reports/trial-balance",
        headers=auth_header(token),
        params={"as_of_date": "2026-02-28", "include_zero_balances": "false"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["balances"] is True
    codes = {line["code"] for line in data["lines"]}
    assert accounts["cash"].code in codes
    assert zero_account.code not in codes
    assert Decimal(str(data["total_debit"])) == Decimal(str(data["total_credit"]))


def test_general_ledger_and_account_statement_running_balances(client, db):
    owner, org, accounts = setup_reporting_fixture(db)
    token = create_access_token(str(owner.id))

    gl = client.get(
        f"/organizations/{org.id}/reports/general-ledger",
        headers=auth_header(token),
        params={"from_date": "2026-01-01", "to_date": "2026-02-28", "account_id": str(accounts["cash"].id)},
    )
    assert gl.status_code == 200
    gl_payload = gl.json()
    assert len(gl_payload["accounts"]) == 1
    section = gl_payload["accounts"][0]
    assert Decimal(str(section["opening_balance"])) == Decimal("0")
    assert Decimal(str(section["closing_balance"])) == Decimal("1350.00")
    assert [line["entry_number"] for line in section["lines"]] == ["JNL-000001", "JNL-000002", "JNL-000003", "JNL-000004"]
    assert Decimal(str(section["lines"][-1]["running_balance"])) == Decimal("1350.00")

    statement = client.get(
        f"/organizations/{org.id}/reports/accounts/{accounts['cash'].id}/statement",
        headers=auth_header(token),
        params={"from_date": "2026-01-03", "to_date": "2026-01-31"},
    )
    assert statement.status_code == 200
    statement_payload = statement.json()
    assert Decimal(str(statement_payload["opening_balance"])) == Decimal("1000.00")
    assert Decimal(str(statement_payload["closing_balance"])) == Decimal("1350.00")
    assert len(statement_payload["lines"]) == 3


def test_aged_receivables_groups_customers_and_buckets(client, db):
    owner = create_user(db, "ar-owner@example.com")
    org, period = create_org_with_membership(db, owner, "AR Org")
    customer = Customer(organization_id=org.id, display_name="Acme Customer")
    db.add(customer)
    db.flush()
    receivable = create_account(db, org, "1100", "AR", AccountType.ASSET)
    sales = create_account(db, org, "4000", "Sales", AccountType.REVENUE)
    create_posted_journal(
        db,
        org,
        period,
        owner,
        "JNL-AR-1",
        date(2026, 1, 1),
        "Invoice 1",
        [{"account_id": receivable.id, "debit": Decimal("300.00")}, {"account_id": sales.id, "credit": Decimal("300.00")}],
        source_module="ar",
    )
    create_posted_journal(
        db,
        org,
        period,
        owner,
        "JNL-AR-2",
        date(2026, 2, 1),
        "Invoice 2",
        [{"account_id": receivable.id, "debit": Decimal("150.00")}, {"account_id": sales.id, "credit": Decimal("150.00")}],
        source_module="ar",
    )
    invoice_full = Invoice(organization_id=org.id, customer_id=customer.id, invoice_number="INV-001", status="paid", issue_date=date(2026, 1, 1), due_date=date(2026, 1, 15), currency_code="USD", subtotal_amount=Decimal("100.00"), tax_amount=Decimal("0"), total_amount=Decimal("100.00"), amount_paid=Decimal("100.00"), amount_due=Decimal("0"), created_by_user_id=owner.id)
    invoice_partial = Invoice(organization_id=org.id, customer_id=customer.id, invoice_number="INV-002", status="partially_paid", issue_date=date(2026, 1, 10), due_date=date(2026, 1, 20), currency_code="USD", subtotal_amount=Decimal("300.00"), tax_amount=Decimal("0"), total_amount=Decimal("300.00"), amount_paid=Decimal("100.00"), amount_due=Decimal("200.00"), posted_journal_id=db.scalar(select(JournalEntry.id).where(JournalEntry.entry_number == "JNL-AR-1")), created_by_user_id=owner.id)
    invoice_current = Invoice(organization_id=org.id, customer_id=customer.id, invoice_number="INV-003", status="posted", issue_date=date(2026, 2, 1), due_date=date(2026, 3, 20), currency_code="USD", subtotal_amount=Decimal("150.00"), tax_amount=Decimal("0"), total_amount=Decimal("150.00"), amount_paid=Decimal("0"), amount_due=Decimal("150.00"), posted_journal_id=db.scalar(select(JournalEntry.id).where(JournalEntry.entry_number == "JNL-AR-2")), created_by_user_id=owner.id)
    payment = CustomerPayment(organization_id=org.id, customer_id=customer.id, payment_number="PAY-001", status="posted", payment_date=date(2026, 2, 10), currency_code="USD", amount=Decimal("50.00"), unapplied_amount=Decimal("25.00"), posted_journal_id=db.scalar(select(JournalEntry.id).where(JournalEntry.entry_number == "JNL-AR-2")), created_by_user_id=owner.id)
    db.add_all([invoice_full, invoice_partial, invoice_current, payment])
    db.commit()

    response = client.get(
        f"/organizations/{org.id}/reports/aged-receivables",
        headers=auth_header(create_access_token(str(owner.id))),
        params={"as_of_date": "2026-03-01", "detailed": "true"},
    )
    assert response.status_code == 200
    data = response.json()
    assert Decimal(str(data["total_outstanding"])) == Decimal("350.00")
    customer_line = data["customers"][0]
    assert Decimal(str(customer_line["buckets"]["1_30_days"])) == Decimal("200.00")
    assert Decimal(str(customer_line["buckets"]["current"])) == Decimal("150.00")
    assert Decimal(str(customer_line["unapplied_payments"])) == Decimal("25.00")
    assert {line["invoice_number"] for line in customer_line["invoice_lines"]} == {"INV-002", "INV-003"}


def test_aged_payables_groups_suppliers_and_buckets(client, db):
    owner = create_user(db, "ap-owner@example.com")
    org, period = create_org_with_membership(db, owner, "AP Org")
    supplier = Supplier(organization_id=org.id, display_name="Office Vendor")
    db.add(supplier)
    db.flush()
    payable = create_account(db, org, "2000", "AP", AccountType.LIABILITY)
    expense = create_account(db, org, "5000", "Expense", AccountType.EXPENSE)
    create_posted_journal(
        db,
        org,
        period,
        owner,
        "JNL-AP-1",
        date(2026, 1, 1),
        "Bill 1",
        [{"account_id": expense.id, "debit": Decimal("200.00")}, {"account_id": payable.id, "credit": Decimal("200.00")}],
        source_module="ap",
    )
    bill_partial = Bill(organization_id=org.id, supplier_id=supplier.id, bill_number="BILL-001", status="partially_paid", issue_date=date(2026, 1, 1), due_date=date(2026, 1, 31), currency_code="USD", subtotal_amount=Decimal("200.00"), tax_amount=Decimal("0"), total_amount=Decimal("200.00"), amount_paid=Decimal("50.00"), amount_due=Decimal("150.00"), posted_journal_id=db.scalar(select(JournalEntry.id).where(JournalEntry.entry_number == "JNL-AP-1")), created_by_user_id=owner.id)
    bill_full = Bill(organization_id=org.id, supplier_id=supplier.id, bill_number="BILL-002", status="paid", issue_date=date(2026, 1, 10), due_date=date(2026, 1, 20), currency_code="USD", subtotal_amount=Decimal("100.00"), tax_amount=Decimal("0"), total_amount=Decimal("100.00"), amount_paid=Decimal("100.00"), amount_due=Decimal("0"), created_by_user_id=owner.id)
    supplier_credit = SupplierCredit(organization_id=org.id, supplier_id=supplier.id, supplier_credit_number="SC-001", status="posted", issue_date=date(2026, 2, 5), currency_code="USD", subtotal_amount=Decimal("30.00"), tax_amount=Decimal("0"), total_amount=Decimal("30.00"), unapplied_amount=Decimal("10.00"), posted_journal_id=db.scalar(select(JournalEntry.id).where(JournalEntry.entry_number == "JNL-AP-1")), created_by_user_id=owner.id)
    supplier_payment = SupplierPayment(organization_id=org.id, supplier_id=supplier.id, payment_number="SP-001", status="posted", payment_date=date(2026, 2, 10), currency_code="USD", amount=Decimal("20.00"), unapplied_amount=Decimal("5.00"), posted_journal_id=db.scalar(select(JournalEntry.id).where(JournalEntry.entry_number == "JNL-AP-1")), created_by_user_id=owner.id)
    db.add_all([bill_partial, bill_full, supplier_credit, supplier_payment])
    db.commit()

    response = client.get(
        f"/organizations/{org.id}/reports/aged-payables",
        headers=auth_header(create_access_token(str(owner.id))),
        params={"as_of_date": "2026-03-01", "detailed": "true"},
    )
    assert response.status_code == 200
    data = response.json()
    assert Decimal(str(data["total_outstanding"])) == Decimal("150.00")
    supplier_line = data["suppliers"][0]
    assert Decimal(str(supplier_line["buckets"]["1_30_days"])) == Decimal("150.00")
    assert Decimal(str(supplier_line["unapplied_credits"])) == Decimal("10.00")
    assert Decimal(str(supplier_line["unapplied_payments"])) == Decimal("5.00")
    assert [line["bill_number"] for line in supplier_line["bill_lines"]] == ["BILL-001"]


def test_reporting_exports_and_permissions(client, db):
    owner, org, _accounts = setup_reporting_fixture(db)
    viewer = create_user(db, "report-viewer@example.com")
    staff = create_user(db, "report-staff@example.com")
    outsider = create_user(db, "report-outsider@example.com")
    add_membership(db, viewer, org, "viewer")
    add_membership(db, staff, org, "staff")
    other_org, _period = create_org_with_membership(db, outsider, "Other Org")
    db.commit()

    owner_token = create_access_token(str(owner.id))
    viewer_token = create_access_token(str(viewer.id))
    staff_token = create_access_token(str(staff.id))
    outsider_token = create_access_token(str(outsider.id))

    export_response = client.get(
        f"/organizations/{org.id}/reports/trial-balance/export",
        headers=auth_header(owner_token),
        params={"as_of_date": "2026-02-28", "export_format": "csv"},
    )
    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith("text/csv")
    assert "lines.code" in export_response.text
    assert db.scalar(select(ReportRun.id).where(ReportRun.organization_id == org.id)) is not None
    assert db.scalar(select(ReportExport.id).where(ReportExport.organization_id == org.id)) is not None

    viewer_read = client.get(
        f"/organizations/{org.id}/reports/profit-loss",
        headers=auth_header(viewer_token),
        params={"from_date": "2026-01-01", "to_date": "2026-01-31"},
    )
    assert viewer_read.status_code == 200

    viewer_export = client.get(
        f"/organizations/{org.id}/reports/profit-loss/export",
        headers=auth_header(viewer_token),
        params={"from_date": "2026-01-01", "to_date": "2026-01-31", "export_format": "csv"},
    )
    assert viewer_export.status_code == 403

    staff_read = client.get(
        f"/organizations/{org.id}/reports/profit-loss",
        headers=auth_header(staff_token),
        params={"from_date": "2026-01-01", "to_date": "2026-01-31"},
    )
    assert staff_read.status_code == 403

    cross_org = client.get(
        f"/organizations/{org.id}/reports/profit-loss",
        headers=auth_header(outsider_token),
        params={"from_date": "2026-01-01", "to_date": "2026-01-31"},
    )
    assert cross_org.status_code == 403
    assert other_org.id != org.id
