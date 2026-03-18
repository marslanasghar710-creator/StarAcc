from decimal import Decimal


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def bootstrap(client, email="ap-owner@example.com"):
    client.post("/auth/register", json={"email": email, "password": "StrongPass123"})
    tok = client.post("/auth/login", json={"email": email, "password": "StrongPass123"}).json()
    org = client.post("/organizations", headers=auth_header(tok["access_token"]), json={"name": "AP Org"}).json()
    client.post(
        f"/organizations/{org['id']}/periods",
        headers=auth_header(tok["access_token"]),
        json={"name": "Jan 2026", "start_date": "2026-01-01", "end_date": "2026-01-31", "fiscal_year": 2026, "period_number": 1},
    )
    ap = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "2100", "name": "Accounts Payable", "account_type": "liability"}).json()
    exp = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "5000", "name": "Office Expense", "account_type": "expense"}).json()
    cash = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "1000", "name": "Cash", "account_type": "asset"}).json()
    return tok, org, ap, exp, cash


def test_supplier_create_and_archive(client):
    tok, org, *_ = bootstrap(client)
    s = client.post(f"/organizations/{org['id']}/suppliers", headers=auth_header(tok["access_token"]), json={"display_name": "Vendor A", "email": "Pay@Vendor.com"})
    assert s.status_code == 200
    sid = s.json()["id"]
    assert client.get(f"/organizations/{org['id']}/suppliers/{sid}", headers=auth_header(tok["access_token"])).status_code == 200
    assert client.delete(f"/organizations/{org['id']}/suppliers/{sid}", headers=auth_header(tok["access_token"])).status_code == 200


def test_bill_post_and_supplier_payment_allocate(client, db):
    from app.db.models import AccountingSettings

    tok, org, ap, exp, cash = bootstrap(client, "ap-owner2@example.com")
    supplier = client.post(f"/organizations/{org['id']}/suppliers", headers=auth_header(tok["access_token"]), json={"display_name": "Vendor B"}).json()

    db.add(AccountingSettings(organization_id=org["id"], accounts_receivable_control_account_id=ap["id"], accounts_payable_control_account_id=ap["id"], default_expense_account_id=exp["id"], default_supplier_payments_account_id=cash["id"]))
    db.commit()

    bill = client.post(
        f"/organizations/{org['id']}/bills",
        headers=auth_header(tok["access_token"]),
        json={
            "supplier_id": supplier["id"],
            "issue_date": "2026-01-10",
            "due_date": "2026-01-20",
            "currency_code": "USD",
            "items": [{"description": "Stationery", "quantity": "2", "unit_price": "50", "account_id": exp["id"]}],
        },
    )
    assert bill.status_code == 200
    bid = bill.json()["id"]

    assert client.post(f"/organizations/{org['id']}/bills/{bid}/approve", headers=auth_header(tok["access_token"])).status_code == 200
    posted = client.post(f"/organizations/{org['id']}/bills/{bid}/post", headers=auth_header(tok["access_token"]))
    assert posted.status_code == 200
    assert posted.json()["posted_journal_id"] is not None

    pay = client.post(f"/organizations/{org['id']}/supplier-payments", headers=auth_header(tok["access_token"]), json={"supplier_id": supplier["id"], "payment_date": "2026-01-15", "currency_code": "USD", "amount": "100", "disbursement_account_id": cash["id"]})
    pid = pay.json()["id"]
    assert client.post(f"/organizations/{org['id']}/supplier-payments/{pid}/post", headers=auth_header(tok["access_token"])).status_code == 200
    alloc = client.post(f"/organizations/{org['id']}/supplier-payments/{pid}/allocate", headers=auth_header(tok["access_token"]), json={"bill_id": bid, "allocated_amount": "100", "allocation_date": "2026-01-15"})
    assert alloc.status_code == 200

    bill_after = client.get(f"/organizations/{org['id']}/bills/{bid}", headers=auth_header(tok["access_token"]))
    assert Decimal(str(bill_after.json()["amount_due"])) == Decimal("0")
