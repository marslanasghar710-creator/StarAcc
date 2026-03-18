from decimal import Decimal


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def bootstrap(client, email="ar-owner@example.com"):
    client.post("/auth/register", json={"email": email, "password": "StrongPass123"})
    tok = client.post("/auth/login", json={"email": email, "password": "StrongPass123"}).json()
    org = client.post("/organizations", headers=auth_header(tok["access_token"]), json={"name": "AR Org"}).json()
    client.post(
        f"/organizations/{org['id']}/periods",
        headers=auth_header(tok["access_token"]),
        json={"name": "Jan 2026", "start_date": "2026-01-01", "end_date": "2026-01-31", "fiscal_year": 2026, "period_number": 1},
    )
    ar = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "1100", "name": "Accounts Receivable", "account_type": "asset"}).json()
    rev = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "4000", "name": "Sales", "account_type": "revenue"}).json()
    cash = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "1000", "name": "Cash", "account_type": "asset"}).json()
    return tok, org, ar, rev, cash


def test_customer_create_and_archive(client):
    tok, org, *_ = bootstrap(client)
    c = client.post(f"/organizations/{org['id']}/customers", headers=auth_header(tok["access_token"]), json={"display_name": "Acme Customer", "email": "Billing@Acme.com"})
    assert c.status_code == 200
    cid = c.json()["id"]
    get = client.get(f"/organizations/{org['id']}/customers/{cid}", headers=auth_header(tok["access_token"]))
    assert get.status_code == 200
    arch = client.delete(f"/organizations/{org['id']}/customers/{cid}", headers=auth_header(tok["access_token"]))
    assert arch.status_code == 200


def test_invoice_create_approve_send_post(client, db):
    from app.db.models import AccountingSettings

    tok, org, ar, rev, cash = bootstrap(client, "ar-owner2@example.com")
    customer = client.post(f"/organizations/{org['id']}/customers", headers=auth_header(tok["access_token"]), json={"display_name": "Globex"}).json()

    db.add(AccountingSettings(organization_id=org["id"], accounts_receivable_control_account_id=ar["id"], default_sales_revenue_account_id=rev["id"], default_customer_receipts_account_id=cash["id"]))
    db.commit()

    inv = client.post(
        f"/organizations/{org['id']}/invoices",
        headers=auth_header(tok["access_token"]),
        json={
            "customer_id": customer["id"],
            "issue_date": "2026-01-10",
            "due_date": "2026-01-20",
            "currency_code": "USD",
            "items": [{"description": "Service", "quantity": "2", "unit_price": "50", "account_id": rev["id"]}],
        },
    )
    assert inv.status_code == 200
    iid = inv.json()["id"]

    assert client.post(f"/organizations/{org['id']}/invoices/{iid}/approve", headers=auth_header(tok["access_token"])).status_code == 200
    assert client.post(f"/organizations/{org['id']}/invoices/{iid}/send", headers=auth_header(tok["access_token"])).status_code == 200
    posted = client.post(f"/organizations/{org['id']}/invoices/{iid}/post", headers=auth_header(tok["access_token"]))
    assert posted.status_code == 200
    assert posted.json()["posted_journal_id"] is not None


def test_payment_post_and_allocate_marks_paid(client, db):
    from app.db.models import AccountingSettings

    tok, org, ar, rev, cash = bootstrap(client, "ar-owner3@example.com")
    customer = client.post(f"/organizations/{org['id']}/customers", headers=auth_header(tok["access_token"]), json={"display_name": "Umbrella"}).json()
    db.add(AccountingSettings(organization_id=org["id"], accounts_receivable_control_account_id=ar["id"], default_sales_revenue_account_id=rev["id"], default_customer_receipts_account_id=cash["id"]))
    db.commit()

    inv = client.post(f"/organizations/{org['id']}/invoices", headers=auth_header(tok["access_token"]), json={"customer_id": customer["id"], "issue_date": "2026-01-10", "due_date": "2026-01-20", "currency_code": "USD", "items": [{"description": "Service", "quantity": "1", "unit_price": "100", "account_id": rev["id"]}]})
    iid = inv.json()["id"]
    client.post(f"/organizations/{org['id']}/invoices/{iid}/approve", headers=auth_header(tok["access_token"]))
    client.post(f"/organizations/{org['id']}/invoices/{iid}/post", headers=auth_header(tok["access_token"]))

    p = client.post(f"/organizations/{org['id']}/customer-payments", headers=auth_header(tok["access_token"]), json={"customer_id": customer["id"], "payment_date": "2026-01-15", "currency_code": "USD", "amount": "100", "deposit_account_id": cash["id"]})
    pid = p.json()["id"]
    assert client.post(f"/organizations/{org['id']}/customer-payments/{pid}/post", headers=auth_header(tok["access_token"])).status_code == 200
    alloc = client.post(f"/organizations/{org['id']}/customer-payments/{pid}/allocate", headers=auth_header(tok["access_token"]), json={"invoice_id": iid, "allocated_amount": "100", "allocation_date": "2026-01-15"})
    assert alloc.status_code == 200

    inv_after = client.get(f"/organizations/{org['id']}/invoices/{iid}", headers=auth_header(tok["access_token"]))
    assert Decimal(str(inv_after.json()["amount_due"])) == Decimal("0")
