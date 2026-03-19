from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import select

from app.core.enums import AccountType, EmailStatus, MembershipStatus, NotificationType
from app.core.security import create_access_token, hash_password
from app.core.config import settings
from app.db.models import (
    AccountingSettings,
    Account,
    Bill,
    Customer,
    EmailLog,
    FinancialPeriod,
    InAppNotification,
    Invoice,
    NumberingSettings,
    Organization,
    OrganizationSettings,
    OrganizationUser,
    Role,
    Supplier,
    TaxSettings,
    User,
    UserProfile,
)
from app.services.notification_service import NotificationService

UTC = timezone.utc


@pytest.fixture(autouse=True)
def file_storage_root(tmp_path, monkeypatch):
    root = tmp_path / "uploads"
    root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "file_storage_root", str(root))
    return root


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def create_user(db, email: str):
    user = User(email=email, password_hash=hash_password("StrongPass123"))
    db.add(user)
    db.flush()
    db.add(UserProfile(user_id=user.id))
    db.flush()
    return user


def create_org_context(db, owner: User, name: str = "Ops Org"):
    owner_role = db.scalar(select(Role).where(Role.name == "owner"))
    org = Organization(name=name, base_currency="USD", fiscal_year_start_month=1, fiscal_year_start_day=1, timezone="UTC")
    db.add(org)
    db.flush()
    db.add(OrganizationSettings(organization_id=org.id))
    db.add(OrganizationUser(user_id=owner.id, organization_id=org.id, role_id=owner_role.id, is_default=True, joined_at=datetime.now(UTC), status=MembershipStatus.ACTIVE))
    db.add(FinancialPeriod(organization_id=org.id, name="FY26", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), fiscal_year=2026, period_number=1, status="open"))
    db.flush()
    return org


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
    db.add(
        AccountingSettings(
            organization_id=org.id,
            accounts_receivable_control_account_id=ar_account.id,
            accounts_payable_control_account_id=ap_account.id,
            default_output_tax_account_id=output_tax_account.id,
            default_input_tax_account_id=input_tax_account.id,
        )
    )
    db.add(
        TaxSettings(
            organization_id=org.id,
            tax_enabled=True,
            tax_basis="accrual",
            prices_entered_are="exclusive",
            tax_rounding_method="line",
            default_output_tax_account_id=output_tax_account.id,
            default_input_tax_account_id=input_tax_account.id,
        )
    )
    db.flush()


def create_customer_supplier(db, org: Organization, *, customer_email: str | None = None):
    customer = Customer(organization_id=org.id, display_name="Acme Customer", email=customer_email)
    supplier = Supplier(organization_id=org.id, display_name="Acme Supplier", email="supplier@example.com")
    db.add_all([customer, supplier])
    db.flush()
    return customer, supplier


def upload_file(client, org_id, token, filename="receipt.pdf", content=b"pdf-content", mime_type="application/pdf"):
    response = client.post(
        f"/organizations/{org_id}/files/upload",
        headers=auth_header(token),
        files={"upload": (filename, content, mime_type)},
    )
    assert response.status_code == 200, response.text
    return response.json()["file"]


def test_preferences_branding_numbering_and_permissions(client, db):
    owner = create_user(db, "owner-settings@example.com")
    staff = create_user(db, "staff-settings@example.com")
    outsider = create_user(db, "outsider-settings@example.com")
    org = create_org_context(db, owner)
    outsider_org = create_org_context(db, outsider, "Other Org")
    add_member(db, staff, org, "staff")

    cash = create_account(db, org, "1000", "Cash", AccountType.ASSET)
    ar = create_account(db, org, "1100", "AR", AccountType.ASSET)
    ap = create_account(db, org, "2000", "AP", AccountType.LIABILITY)
    output_tax = create_account(db, org, "2100", "Output Tax", AccountType.LIABILITY)
    input_tax = create_account(db, org, "1200", "Input Tax", AccountType.ASSET)
    revenue = create_account(db, org, "4000", "Revenue", AccountType.REVENUE)
    expense = create_account(db, org, "5000", "Expense", AccountType.EXPENSE)
    configure_accounting_and_tax(db, org, ar_account=ar, ap_account=ap, output_tax_account=output_tax, input_tax_account=input_tax)
    customer, supplier = create_customer_supplier(db, org)
    db.commit()

    owner_token = create_access_token(str(owner.id))
    staff_token = create_access_token(str(staff.id))
    outsider_token = create_access_token(str(outsider.id))

    pref = client.patch(
        f"/organizations/{org.id}/settings/preferences",
        headers=auth_header(owner_token),
        json={"default_locale": "en_GB", "timezone": "America/New_York", "week_start_day": 1, "default_document_language": "en"},
    )
    assert pref.status_code == 200
    assert pref.json()["timezone"] == "America/New_York"

    forbidden_pref = client.patch(
        f"/organizations/{org.id}/settings/preferences",
        headers=auth_header(staff_token),
        json={"timezone": "UTC"},
    )
    assert forbidden_pref.status_code == 403

    org_logo = upload_file(client, org.id, owner_token, filename="logo.png", content=b"png", mime_type="image/png")
    other_logo = upload_file(client, outsider_org.id, outsider_token, filename="other.png", content=b"png", mime_type="image/png")

    branding = client.patch(
        f"/organizations/{org.id}/settings/branding",
        headers=auth_header(owner_token),
        json={"brand_name": "Acme Books", "logo_file_id": org_logo["id"], "primary_color": "#112233", "invoice_terms_default": "Net 15"},
    )
    assert branding.status_code == 200
    assert branding.json()["logo_file_id"] == org_logo["id"]

    cross_logo = client.patch(
        f"/organizations/{org.id}/settings/branding",
        headers=auth_header(owner_token),
        json={"logo_file_id": other_logo["id"]},
    )
    assert cross_logo.status_code == 403

    numbering = client.patch(
        f"/organizations/{org.id}/settings/numbering",
        headers=auth_header(owner_token),
        json={"invoice_prefix": "SINV", "bill_prefix": "PBIL", "next_invoice_number": 42, "next_bill_number": 7},
    )
    assert numbering.status_code == 200
    assert numbering.json()["invoice_prefix"] == "SINV"

    invoice = client.post(
        f"/organizations/{org.id}/invoices",
        headers=auth_header(owner_token),
        json={
            "customer_id": str(customer.id),
            "issue_date": "2026-01-10",
            "due_date": "2026-01-20",
            "currency_code": "USD",
            "items": [{"description": "Consulting", "quantity": "1", "unit_price": "100.00", "account_id": str(revenue.id)}],
        },
    )
    assert invoice.status_code == 200, invoice.text
    assert invoice.json()["invoice_number"] == "SINV-000042"

    bill = client.post(
        f"/organizations/{org.id}/bills",
        headers=auth_header(owner_token),
        json={
            "supplier_id": str(supplier.id),
            "issue_date": "2026-01-12",
            "due_date": "2026-01-30",
            "currency_code": "USD",
            "items": [{"description": "Office expense", "quantity": "1", "unit_price": "50.00", "account_id": str(expense.id)}],
        },
    )
    assert bill.status_code == 200, bill.text
    assert bill.json()["bill_number"] == "PBIL-000007"

    settings_view = client.get(f"/organizations/{org.id}/settings/numbering", headers=auth_header(staff_token))
    assert settings_view.status_code == 403

    db.refresh(db.scalar(select(NumberingSettings).where(NumberingSettings.organization_id == org.id)))
    _ = cash  # keep account creation explicit for accounting completeness


def test_files_download_soft_delete_and_document_links(client, db):
    owner = create_user(db, "owner-files@example.com")
    viewer = create_user(db, "viewer-files@example.com")
    outsider = create_user(db, "outsider-files@example.com")
    org = create_org_context(db, owner, "Files Org")
    outsider_org = create_org_context(db, outsider, "Outside Org")
    add_member(db, viewer, org, "viewer")

    ar = create_account(db, org, "1100", "AR", AccountType.ASSET)
    ap = create_account(db, org, "2000", "AP", AccountType.LIABILITY)
    output_tax = create_account(db, org, "2100", "Output Tax", AccountType.LIABILITY)
    input_tax = create_account(db, org, "1200", "Input Tax", AccountType.ASSET)
    revenue = create_account(db, org, "4000", "Revenue", AccountType.REVENUE)
    expense = create_account(db, org, "5000", "Expense", AccountType.EXPENSE)
    configure_accounting_and_tax(db, org, ar_account=ar, ap_account=ap, output_tax_account=output_tax, input_tax_account=input_tax)
    customer, supplier = create_customer_supplier(db, org)
    db.commit()

    owner_token = create_access_token(str(owner.id))
    viewer_token = create_access_token(str(viewer.id))
    outsider_token = create_access_token(str(outsider.id))

    file_row = upload_file(client, org.id, owner_token, filename="invoice.pdf")
    file_detail = client.get(f"/organizations/{org.id}/files/{file_row['id']}", headers=auth_header(viewer_token))
    assert file_detail.status_code == 200
    assert file_detail.json()["mime_type"] == "application/pdf"

    download = client.get(f"/organizations/{org.id}/files/{file_row['id']}/download", headers=auth_header(viewer_token))
    assert download.status_code == 200
    assert download.content == b"pdf-content"

    outsider_access = client.get(f"/organizations/{org.id}/files/{file_row['id']}", headers=auth_header(outsider_token))
    assert outsider_access.status_code == 403

    invoice = client.post(
        f"/organizations/{org.id}/invoices",
        headers=auth_header(owner_token),
        json={
            "customer_id": str(customer.id),
            "issue_date": "2026-02-01",
            "due_date": "2026-02-15",
            "currency_code": "USD",
            "items": [{"description": "Work", "quantity": "1", "unit_price": "20.00", "account_id": str(revenue.id)}],
        },
    )
    bill = client.post(
        f"/organizations/{org.id}/bills",
        headers=auth_header(owner_token),
        json={
            "supplier_id": str(supplier.id),
            "issue_date": "2026-02-01",
            "due_date": "2026-02-10",
            "currency_code": "USD",
            "items": [{"description": "Paper", "quantity": "1", "unit_price": "10.00", "account_id": str(expense.id)}],
        },
    )
    assert invoice.status_code == 200 and bill.status_code == 200

    for entity_type, entity_id in [("invoice", invoice.json()["id"]), ("customer", str(customer.id)), ("bill", bill.json()["id"])]:
        link = client.post(
            f"/organizations/{org.id}/documents/links",
            headers=auth_header(owner_token),
            json={"file_id": file_row["id"], "entity_type": entity_type, "entity_id": entity_id},
        )
        assert link.status_code == 200, link.text

    entity_links = client.get(f"/organizations/{org.id}/documents/entity/invoice/{invoice.json()['id']}", headers=auth_header(viewer_token))
    assert entity_links.status_code == 200
    assert len(entity_links.json()["items"]) == 1

    outsider_file = upload_file(client, outsider_org.id, outsider_token, filename="other.pdf")
    cross_link = client.post(
        f"/organizations/{org.id}/documents/links",
        headers=auth_header(owner_token),
        json={"file_id": outsider_file["id"], "entity_type": "invoice", "entity_id": invoice.json()["id"]},
    )
    assert cross_link.status_code == 403

    delete_response = client.delete(f"/organizations/{org.id}/files/{file_row['id']}", headers=auth_header(owner_token))
    assert delete_response.status_code == 200
    deleted_lookup = client.get(f"/organizations/{org.id}/files/{file_row['id']}", headers=auth_header(owner_token))
    assert deleted_lookup.status_code == 404


def test_email_templates_generic_send_failure_and_invoice_send_email(client, db):
    owner = create_user(db, "owner-email@example.com")
    org = create_org_context(db, owner, "Email Org")

    ar = create_account(db, org, "1100", "AR", AccountType.ASSET)
    ap = create_account(db, org, "2000", "AP", AccountType.LIABILITY)
    output_tax = create_account(db, org, "2100", "Output Tax", AccountType.LIABILITY)
    input_tax = create_account(db, org, "1200", "Input Tax", AccountType.ASSET)
    revenue = create_account(db, org, "4000", "Revenue", AccountType.REVENUE)
    configure_accounting_and_tax(db, org, ar_account=ar, ap_account=ap, output_tax_account=output_tax, input_tax_account=input_tax)
    customer, _ = create_customer_supplier(db, org, customer_email="customer@example.com")
    db.commit()

    token = create_access_token(str(owner.id))

    template = client.post(
        f"/organizations/{org.id}/email-templates",
        headers=auth_header(token),
        json={"template_type": "generic_notification", "subject_template": "Hello {{ customer_name }}", "body_template": "Balance: {{ amount_due }}", "is_active": True},
    )
    assert template.status_code == 200

    send_generic = client.post(
        f"/organizations/{org.id}/emails/send",
        headers=auth_header(token),
        json={
            "template_id": template.json()["id"],
            "to_email": "books@example.com",
            "merge_variables": {"customer_name": "Acme", "amount_due": "10.00"},
        },
    )
    assert send_generic.status_code == 200, send_generic.text
    assert send_generic.json()["status"] == EmailStatus.SENT.value

    failed = client.post(
        f"/organizations/{org.id}/emails/send",
        headers=auth_header(token),
        json={
            "subject": "Broken",
            "body": "Fail body",
            "to_email": "notify@fail.test",
        },
    )
    assert failed.status_code == 502
    failed_log = db.scalar(select(EmailLog).where(EmailLog.organization_id == org.id).order_by(EmailLog.created_at.desc()))
    assert failed_log.status == EmailStatus.FAILED

    invoice = client.post(
        f"/organizations/{org.id}/invoices",
        headers=auth_header(token),
        json={
            "customer_id": str(customer.id),
            "issue_date": "2026-03-01",
            "due_date": "2026-03-15",
            "currency_code": "USD",
            "items": [{"description": "Monthly service", "quantity": "1", "unit_price": "100.00", "account_id": str(revenue.id)}],
        },
    )
    assert invoice.status_code == 200
    invoice_id = invoice.json()["id"]
    assert client.post(f"/organizations/{org.id}/invoices/{invoice_id}/approve", headers=auth_header(token)).status_code == 200

    invoice_template = client.post(
        f"/organizations/{org.id}/email-templates",
        headers=auth_header(token),
        json={"template_type": "invoice_send", "subject_template": "Invoice {{ invoice_number }}", "body_template": "Dear {{ customer_name }}, amount due {{ amount_due }}", "is_active": True},
    )
    assert invoice_template.status_code == 200

    send_invoice = client.post(f"/organizations/{org.id}/invoices/{invoice_id}/send-email", headers=auth_header(token))
    assert send_invoice.status_code == 200, send_invoice.text
    assert send_invoice.json()["status"] == EmailStatus.SENT.value

    db.refresh(db.scalar(select(Invoice).where(Invoice.id == invoice_id)))
    invoice_row = db.scalar(select(Invoice).where(Invoice.id == invoice_id))
    assert invoice_row.status.value == "sent"
    assert invoice_row.sent_at is not None

    email_logs = client.get(f"/organizations/{org.id}/emails?entity_type=invoice&entity_id={invoice_id}", headers=auth_header(token))
    assert email_logs.status_code == 200
    assert len(email_logs.json()["items"]) == 1


def test_notifications_list_read_and_mark_all_with_user_isolation(client, db):
    owner = create_user(db, "owner-notify@example.com")
    staff = create_user(db, "staff-notify@example.com")
    org = create_org_context(db, owner, "Notify Org")
    add_member(db, staff, org, "staff")
    db.commit()

    NotificationService(db).create(str(org.id), str(owner.id), user_id=str(owner.id), notification_type=NotificationType.GENERIC, title="One", message="First")
    NotificationService(db).create(str(org.id), str(owner.id), user_id=str(owner.id), notification_type=NotificationType.GENERIC, title="Two", message="Second")
    db.commit()

    owner_token = create_access_token(str(owner.id))
    staff_token = create_access_token(str(staff.id))

    listed = client.get(f"/organizations/{org.id}/notifications", headers=auth_header(owner_token))
    assert listed.status_code == 200
    assert len(listed.json()["items"]) == 2
    first_notification_id = listed.json()["items"][0]["id"]

    unread = client.get(f"/organizations/{org.id}/notifications/unread-count", headers=auth_header(owner_token))
    assert unread.status_code == 200
    assert unread.json()["unread_count"] == 2

    cross_user = client.post(f"/organizations/{org.id}/notifications/{first_notification_id}/read", headers=auth_header(staff_token))
    assert cross_user.status_code == 404

    mark_one = client.post(f"/organizations/{org.id}/notifications/{first_notification_id}/read", headers=auth_header(owner_token))
    assert mark_one.status_code == 200
    assert mark_one.json()["is_read"] is True

    unread_after_one = client.get(f"/organizations/{org.id}/notifications/unread-count", headers=auth_header(owner_token))
    assert unread_after_one.json()["unread_count"] == 1

    mark_all = client.post(f"/organizations/{org.id}/notifications/read-all", headers=auth_header(owner_token))
    assert mark_all.status_code == 200
    assert mark_all.json()["updated"] == 1

    unread_after_all = client.get(f"/organizations/{org.id}/notifications/unread-count", headers=auth_header(owner_token))
    assert unread_after_all.json()["unread_count"] == 0
    stored_rows = db.scalars(select(InAppNotification).where(InAppNotification.organization_id == org.id)).all()
    assert all(row.is_read for row in stored_rows)


def test_file_and_settings_rbac_boundaries(client, db):
    owner = create_user(db, "owner-rbac@example.com")
    viewer = create_user(db, "viewer-rbac@example.com")
    org = create_org_context(db, owner, "RBAC Org")
    add_member(db, viewer, org, "viewer")
    db.commit()

    owner_token = create_access_token(str(owner.id))
    viewer_token = create_access_token(str(viewer.id))

    no_upload = client.post(
        f"/organizations/{org.id}/files/upload",
        headers=auth_header(viewer_token),
        files={"upload": ("note.txt", b"hello", "text/plain")},
    )
    assert no_upload.status_code == 403

    no_settings_update = client.patch(
        f"/organizations/{org.id}/settings/preferences",
        headers=auth_header(viewer_token),
        json={"timezone": "UTC"},
    )
    assert no_settings_update.status_code == 403

    uploaded = upload_file(client, org.id, owner_token, filename="note.txt", content=b"hello", mime_type="text/plain")
    can_read = client.get(f"/organizations/{org.id}/files/{uploaded['id']}", headers=auth_header(viewer_token))
    assert can_read.status_code == 200
