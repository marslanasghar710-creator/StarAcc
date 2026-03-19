from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.enums import AccountType, MembershipStatus
from app.core.security import create_access_token, hash_password
from app.db.models import (
    AccountingSettings,
    Account,
    Bill,
    Customer,
    FinancialPeriod,
    Invoice,
    JournalEntry,
    JournalLine,
    Organization,
    OrganizationSettings,
    OrganizationUser,
    Role,
    Supplier,
    TaxCode,
    TaxRate,
    TaxSettings,
    TaxTransaction,
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


def create_org_context(db, owner: User, name: str = "Tax Org"):
    owner_role = db.scalar(select(Role).where(Role.name == "owner"))
    org = Organization(name=name, base_currency="USD", fiscal_year_start_month=1, fiscal_year_start_day=1, timezone="UTC")
    db.add(org)
    db.flush()
    db.add(OrganizationSettings(organization_id=org.id))
    db.add(OrganizationUser(user_id=owner.id, organization_id=org.id, role_id=owner_role.id, is_default=True, joined_at=datetime.now(UTC), status=MembershipStatus.ACTIVE))
    period = FinancialPeriod(organization_id=org.id, name="FY26", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), fiscal_year=2026, period_number=1, status="open")
    db.add(period)
    db.flush()
    return org, period


def add_member(db, user: User, org: Organization, role_name: str):
    role = db.scalar(select(Role).where(Role.name == role_name))
    db.add(OrganizationUser(user_id=user.id, organization_id=org.id, role_id=role.id, is_default=False, joined_at=datetime.now(UTC), status=MembershipStatus.ACTIVE))
    db.flush()


def create_account(db, org: Organization, code: str, name: str, account_type: AccountType):
    normal = "debit" if account_type in {AccountType.ASSET, AccountType.EXPENSE} else "credit"
    account = Account(organization_id=org.id, code=code, name=name, account_type=account_type, normal_balance=normal)
    db.add(account)
    db.flush()
    return account


def configure_accounting_and_tax(db, org: Organization, *, ar_account, ap_account, output_tax_account, input_tax_account):
    settings = AccountingSettings(
        organization_id=org.id,
        accounts_receivable_control_account_id=ar_account.id,
        accounts_payable_control_account_id=ap_account.id,
        default_output_tax_account_id=output_tax_account.id,
        default_input_tax_account_id=input_tax_account.id,
    )
    tax_settings = TaxSettings(
        organization_id=org.id,
        tax_enabled=True,
        tax_basis="accrual",
        prices_entered_are="exclusive",
        tax_rounding_method="line",
        default_output_tax_account_id=output_tax_account.id,
        default_input_tax_account_id=input_tax_account.id,
    )
    db.add_all([settings, tax_settings])
    db.flush()
    return settings, tax_settings


def create_customer_supplier(db, org: Organization):
    customer = Customer(organization_id=org.id, display_name="Acme Customer")
    supplier = Supplier(organization_id=org.id, display_name="Office Supplier")
    db.add_all([customer, supplier])
    db.flush()
    return customer, supplier


def create_tax_master(client, org_id, token):
    rate = client.post(
        f"/organizations/{org_id}/tax/rates",
        headers=auth_header(token),
        json={"name": "VAT 20", "code": "VAT20", "percentage": "20.00", "tax_type": "standard", "scope": "both", "report_group": "vat_standard"},
    )
    assert rate.status_code == 200
    code = client.post(
        f"/organizations/{org_id}/tax/codes",
        headers=auth_header(token),
        json={"name": "VAT 20", "code": "VAT20", "calculation_method": "percentage", "applies_to": "both", "components": [{"tax_rate_id": rate.json()["id"], "sequence_number": 1, "compound_on_previous": False}]},
    )
    assert code.status_code == 200
    exempt = client.post(
        f"/organizations/{org_id}/tax/codes",
        headers=auth_header(token),
        json={"name": "EXEMPT", "code": "EXEMPT", "calculation_method": "exempt", "applies_to": "both", "components": []},
    )
    assert exempt.status_code == 200
    return rate.json(), code.json(), exempt.json()


def test_tax_settings_update_validation_and_same_org_enforcement(client, db):
    owner = create_user(db, "tax-settings@example.com")
    org, _period = create_org_context(db, owner)
    other_owner = create_user(db, "other-owner@example.com")
    other_org, _ = create_org_context(db, other_owner, "Other Org")
    ar = create_account(db, org, "1100", "AR", AccountType.ASSET)
    ap = create_account(db, org, "2000", "AP", AccountType.LIABILITY)
    output_tax = create_account(db, org, "2100", "Output Tax", AccountType.LIABILITY)
    input_tax = create_account(db, org, "1200", "Input Tax", AccountType.ASSET)
    other_output = create_account(db, other_org, "2100", "Other Output Tax", AccountType.LIABILITY)
    configure_accounting_and_tax(db, org, ar_account=ar, ap_account=ap, output_tax_account=output_tax, input_tax_account=input_tax)
    db.commit()

    token = create_access_token(str(owner.id))
    ok = client.patch(
        f"/organizations/{org.id}/tax/settings",
        headers=auth_header(token),
        json={"tax_enabled": True, "default_output_tax_account_id": str(output_tax.id), "default_input_tax_account_id": str(input_tax.id)},
    )
    assert ok.status_code == 200

    bad_type = client.patch(
        f"/organizations/{org.id}/tax/settings",
        headers=auth_header(token),
        json={"default_output_tax_account_id": str(ar.id)},
    )
    assert bad_type.status_code == 403

    bad_org = client.patch(
        f"/organizations/{org.id}/tax/settings",
        headers=auth_header(token),
        json={"default_output_tax_account_id": str(other_output.id)},
    )
    assert bad_org.status_code == 403


def test_tax_rates_codes_preview_and_cross_org_permissions(client, db):
    owner = create_user(db, "tax-master@example.com")
    viewer = create_user(db, "tax-viewer@example.com")
    outsider = create_user(db, "tax-outsider@example.com")
    org, _ = create_org_context(db, owner)
    outsider_org, _ = create_org_context(db, outsider, "Outsider Org")
    add_member(db, viewer, org, "viewer")
    ar = create_account(db, org, "1100", "AR", AccountType.ASSET)
    ap = create_account(db, org, "2000", "AP", AccountType.LIABILITY)
    output_tax = create_account(db, org, "2100", "Output Tax", AccountType.LIABILITY)
    input_tax = create_account(db, org, "1200", "Input Tax", AccountType.ASSET)
    configure_accounting_and_tax(db, org, ar_account=ar, ap_account=ap, output_tax_account=output_tax, input_tax_account=input_tax)
    db.commit()

    owner_token = create_access_token(str(owner.id))
    viewer_token = create_access_token(str(viewer.id))
    outsider_token = create_access_token(str(outsider.id))

    rate, code, exempt = create_tax_master(client, org.id, owner_token)
    duplicate = client.post(
        f"/organizations/{org.id}/tax/rates",
        headers=auth_header(owner_token),
        json={"name": "Duplicate", "code": "VAT20", "percentage": "20.00", "tax_type": "standard", "scope": "both"},
    )
    assert duplicate.status_code == 403

    exclusive = client.post(
        f"/organizations/{org.id}/tax/calculate-preview",
        headers=auth_header(owner_token),
        json={"lines": [{"description": "Service", "quantity": "1", "unit_price": "100.00", "tax_code_id": code["id"], "price_mode": "exclusive", "usage": "sales"}]},
    )
    assert exclusive.status_code == 200
    assert Decimal(str(exclusive.json()["total_amount"])) == Decimal("120.00")
    assert Decimal(str(exclusive.json()["tax_amount"])) == Decimal("20.00")

    inclusive = client.post(
        f"/organizations/{org.id}/tax/calculate-preview",
        headers=auth_header(owner_token),
        json={"lines": [{"description": "Service", "quantity": "1", "unit_price": "120.00", "tax_code_id": code["id"], "price_mode": "inclusive", "usage": "sales"}]},
    )
    assert inclusive.status_code == 200
    assert Decimal(str(inclusive.json()["subtotal_amount"])) == Decimal("100.00")
    assert Decimal(str(inclusive.json()["tax_amount"])) == Decimal("20.00")

    exempt_preview = client.post(
        f"/organizations/{org.id}/tax/calculate-preview",
        headers=auth_header(owner_token),
        json={"lines": [{"description": "Service", "quantity": "1", "unit_price": "100.00", "tax_code_id": exempt["id"], "price_mode": "exclusive", "usage": "sales"}]},
    )
    assert exempt_preview.status_code == 200
    assert Decimal(str(exempt_preview.json()["tax_amount"])) == Decimal("0")

    viewer_read = client.get(f"/organizations/{org.id}/tax/rates", headers=auth_header(viewer_token))
    assert viewer_read.status_code == 200
    outsider_read = client.get(f"/organizations/{org.id}/tax/rates", headers=auth_header(outsider_token))
    assert outsider_read.status_code == 403
    assert outsider_org.id != org.id


def test_invoice_and_credit_note_tax_posting_creates_tax_transactions(client, db):
    owner = create_user(db, "tax-ar@example.com")
    org, _period = create_org_context(db, owner)
    cash = create_account(db, org, "1000", "Cash", AccountType.ASSET)
    ar = create_account(db, org, "1100", "AR", AccountType.ASSET)
    output_tax = create_account(db, org, "2100", "Output Tax", AccountType.LIABILITY)
    revenue = create_account(db, org, "4000", "Sales", AccountType.REVENUE)
    ap = create_account(db, org, "2000", "AP", AccountType.LIABILITY)
    input_tax = create_account(db, org, "1200", "Input Tax", AccountType.ASSET)
    configure_accounting_and_tax(db, org, ar_account=ar, ap_account=ap, output_tax_account=output_tax, input_tax_account=input_tax)
    customer, _supplier = create_customer_supplier(db, org)
    db.commit()
    token = create_access_token(str(owner.id))
    _rate, code, _exempt = create_tax_master(client, org.id, token)

    invoice = client.post(
        f"/organizations/{org.id}/invoices",
        headers=auth_header(token),
        json={"customer_id": str(customer.id), "issue_date": "2026-01-10", "due_date": "2026-01-20", "currency_code": "USD", "items": [{"description": "Consulting", "quantity": "1", "unit_price": "100.00", "account_id": str(revenue.id), "tax_code_id": code["id"]}]},
    )
    assert invoice.status_code == 200
    invoice_id = invoice.json()["id"]
    assert client.post(f"/organizations/{org.id}/invoices/{invoice_id}/approve", headers=auth_header(token)).status_code == 200
    posted = client.post(f"/organizations/{org.id}/invoices/{invoice_id}/post", headers=auth_header(token))
    assert posted.status_code == 200
    inv = db.scalar(select(Invoice).where(Invoice.id == invoice_id))
    lines = db.scalars(select(JournalLine).where(JournalLine.journal_entry_id == inv.posted_journal_id).order_by(JournalLine.line_number)).all()
    assert len(lines) == 3
    assert Decimal(lines[0].debit_amount) == Decimal("120.00")
    assert Decimal(lines[1].credit_amount) == Decimal("100.00")
    assert Decimal(lines[2].credit_amount) == Decimal("20.00")
    tax_txn = db.scalars(select(TaxTransaction).where(TaxTransaction.source_type == "invoice", TaxTransaction.source_id == str(inv.id))).all()
    assert len(tax_txn) == 1
    assert Decimal(tax_txn[0].tax_amount) == Decimal("20.00")

    credit_note = client.post(
        f"/organizations/{org.id}/credit-notes",
        headers=auth_header(token),
        json={"customer_id": str(customer.id), "issue_date": "2026-01-15", "currency_code": "USD", "items": [{"description": "Rebate", "quantity": "1", "unit_price": "50.00", "account_id": str(revenue.id), "tax_code_id": code["id"]}]},
    )
    assert credit_note.status_code == 200
    note_id = credit_note.json()["id"]
    assert client.post(f"/organizations/{org.id}/credit-notes/{note_id}/approve", headers=auth_header(token)).status_code == 200
    assert client.post(f"/organizations/{org.id}/credit-notes/{note_id}/post", headers=auth_header(token)).status_code == 200
    credit_tax_txn = db.scalars(select(TaxTransaction).where(TaxTransaction.source_type == "credit_note", TaxTransaction.source_id == note_id)).all()
    assert len(credit_tax_txn) == 1
    assert Decimal(credit_tax_txn[0].tax_amount) == Decimal("-10.00")


def test_bill_and_supplier_credit_tax_posting_and_summary_export_permissions(client, db):
    owner = create_user(db, "tax-ap@example.com")
    viewer = create_user(db, "tax-viewer-summary@example.com")
    staff = create_user(db, "tax-staff-summary@example.com")
    org, _period = create_org_context(db, owner)
    add_member(db, viewer, org, "viewer")
    add_member(db, staff, org, "staff")
    expense = create_account(db, org, "5000", "Expense", AccountType.EXPENSE)
    ap = create_account(db, org, "2000", "AP", AccountType.LIABILITY)
    input_tax = create_account(db, org, "1200", "Input Tax", AccountType.ASSET)
    ar = create_account(db, org, "1100", "AR", AccountType.ASSET)
    output_tax = create_account(db, org, "2100", "Output Tax", AccountType.LIABILITY)
    configure_accounting_and_tax(db, org, ar_account=ar, ap_account=ap, output_tax_account=output_tax, input_tax_account=input_tax)
    _customer, supplier = create_customer_supplier(db, org)
    db.commit()
    owner_token = create_access_token(str(owner.id))
    viewer_token = create_access_token(str(viewer.id))
    staff_token = create_access_token(str(staff.id))
    _rate, code, _exempt = create_tax_master(client, org.id, owner_token)

    bill = client.post(
        f"/organizations/{org.id}/bills",
        headers=auth_header(owner_token),
        json={"supplier_id": str(supplier.id), "issue_date": "2026-02-10", "due_date": "2026-02-20", "currency_code": "USD", "items": [{"description": "Office", "quantity": "1", "unit_price": "100.00", "account_id": str(expense.id), "tax_code_id": code["id"]}]},
    )
    assert bill.status_code == 200
    bill_id = bill.json()["id"]
    assert client.post(f"/organizations/{org.id}/bills/{bill_id}/approve", headers=auth_header(owner_token)).status_code == 200
    assert client.post(f"/organizations/{org.id}/bills/{bill_id}/post", headers=auth_header(owner_token)).status_code == 200
    posted_bill = db.scalar(select(Bill).where(Bill.id == bill_id))
    bill_lines = db.scalars(select(JournalLine).where(JournalLine.journal_entry_id == posted_bill.posted_journal_id).order_by(JournalLine.line_number)).all()
    assert Decimal(bill_lines[0].debit_amount) == Decimal("100.00")
    assert Decimal(bill_lines[1].debit_amount) == Decimal("20.00")
    assert Decimal(bill_lines[2].credit_amount) == Decimal("120.00")

    supplier_credit = client.post(
        f"/organizations/{org.id}/supplier-credits",
        headers=auth_header(owner_token),
        json={"supplier_id": str(supplier.id), "issue_date": "2026-02-12", "currency_code": "USD", "items": [{"description": "Bill credit", "quantity": "1", "unit_price": "50.00", "account_id": str(expense.id), "tax_code_id": code["id"]}]},
    )
    assert supplier_credit.status_code == 200
    supplier_credit_id = supplier_credit.json()["id"]
    assert client.post(f"/organizations/{org.id}/supplier-credits/{supplier_credit_id}/approve", headers=auth_header(owner_token)).status_code == 200
    assert client.post(f"/organizations/{org.id}/supplier-credits/{supplier_credit_id}/post", headers=auth_header(owner_token)).status_code == 200
    credit_txn = db.scalars(select(TaxTransaction).where(TaxTransaction.source_type == "supplier_credit", TaxTransaction.source_id == supplier_credit_id)).all()
    assert len(credit_txn) == 1
    assert Decimal(credit_txn[0].tax_amount) == Decimal("-10.00")

    summary = client.get(
        f"/organizations/{org.id}/tax/reports/summary",
        headers=auth_header(owner_token),
        params={"from_date": "2026-02-01", "to_date": "2026-02-28"},
    )
    assert summary.status_code == 200
    assert Decimal(str(summary.json()["total_tax_amount"])) == Decimal("10.00")

    export_ok = client.get(
        f"/organizations/{org.id}/tax/reports/summary/export",
        headers=auth_header(owner_token),
        params={"from_date": "2026-02-01", "to_date": "2026-02-28", "export_format": "csv"},
    )
    assert export_ok.status_code == 200
    assert export_ok.headers["content-type"].startswith("text/csv")

    viewer_summary = client.get(
        f"/organizations/{org.id}/tax/reports/summary",
        headers=auth_header(viewer_token),
        params={"from_date": "2026-02-01", "to_date": "2026-02-28"},
    )
    assert viewer_summary.status_code == 200

    viewer_export = client.get(
        f"/organizations/{org.id}/tax/reports/summary/export",
        headers=auth_header(viewer_token),
        params={"from_date": "2026-02-01", "to_date": "2026-02-28", "export_format": "csv"},
    )
    assert viewer_export.status_code == 403

    staff_settings = client.get(f"/organizations/{org.id}/tax/settings", headers=auth_header(staff_token))
    assert staff_settings.status_code == 403
