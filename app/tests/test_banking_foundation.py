from decimal import Decimal


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def bootstrap(client, email="bank-owner@example.com"):
    client.post("/auth/register", json={"email": email, "password": "StrongPass123"})
    tok = client.post("/auth/login", json={"email": email, "password": "StrongPass123"}).json()
    org = client.post("/organizations", headers=auth_header(tok["access_token"]), json={"name": "Bank Org"}).json()
    client.post(
        f"/organizations/{org['id']}/periods",
        headers=auth_header(tok["access_token"]),
        json={"name": "Jan 2026", "start_date": "2026-01-01", "end_date": "2026-01-31", "fiscal_year": 2026, "period_number": 1},
    )
    ap = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "2100", "name": "Accounts Payable", "account_type": "liability"}).json()
    expense = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "5000", "name": "Office Expense", "account_type": "expense"}).json()
    cash = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "1000", "name": "Operating Cash", "account_type": "asset"}).json()
    bank = client.post(
        f"/organizations/{org['id']}/bank-accounts",
        headers=auth_header(tok["access_token"]),
        json={"account_id": cash["id"], "name": "Main Operating", "bank_name": "Star Bank", "account_number_mask": "****1234", "currency_code": "USD", "opening_balance": "0"},
    ).json()
    return tok, org, ap, expense, cash, bank


def test_bank_account_create_and_cash_position(client):
    tok, org, ap, expense, cash, bank = bootstrap(client)
    assert bank["account_id"] == cash["id"]
    listed = client.get(f"/organizations/{org['id']}/bank-accounts", headers=auth_header(tok["access_token"]))
    assert listed.status_code == 200
    assert len(listed.json()["items"]) == 1
    cash_position = client.get(f"/organizations/{org['id']}/banking/cash-position", headers=auth_header(tok["access_token"]))
    assert cash_position.status_code == 200
    item = cash_position.json()["items"][0]
    assert Decimal(str(item["ledger_balance"])) == Decimal("0")
    assert Decimal(str(item["unreconciled_delta"])) == Decimal("0")


def test_ap_supplier_payment_can_be_reconciled_to_bank_transaction(client, db):
    from app.db.models import AccountingSettings

    tok, org, ap, expense, cash, bank = bootstrap(client, "bank-owner2@example.com")
    supplier = client.post(f"/organizations/{org['id']}/suppliers", headers=auth_header(tok["access_token"]), json={"display_name": "Vendor B"}).json()
    db.add(AccountingSettings(organization_id=org["id"], accounts_receivable_control_account_id=ap["id"], accounts_payable_control_account_id=ap["id"], default_expense_account_id=expense["id"], default_supplier_payments_account_id=cash["id"]))
    db.commit()

    bill = client.post(
        f"/organizations/{org['id']}/bills",
        headers=auth_header(tok["access_token"]),
        json={
            "supplier_id": supplier["id"],
            "issue_date": "2026-01-10",
            "due_date": "2026-01-20",
            "currency_code": "USD",
            "items": [{"description": "Stationery", "quantity": "2", "unit_price": "50", "account_id": expense["id"]}],
        },
    ).json()
    client.post(f"/organizations/{org['id']}/bills/{bill['id']}/approve", headers=auth_header(tok["access_token"]))
    client.post(f"/organizations/{org['id']}/bills/{bill['id']}/post", headers=auth_header(tok["access_token"]))

    payment = client.post(
        f"/organizations/{org['id']}/supplier-payments",
        headers=auth_header(tok["access_token"]),
        json={"supplier_id": supplier["id"], "payment_date": "2026-01-15", "currency_code": "USD", "amount": "100", "disbursement_account_id": cash["id"]},
    ).json()
    posted = client.post(f"/organizations/{org['id']}/supplier-payments/{payment['id']}/post", headers=auth_header(tok["access_token"]))
    assert posted.status_code == 200

    bank_txn = client.post(
        f"/organizations/{org['id']}/bank-transactions",
        headers=auth_header(tok["access_token"]),
        json={
            "bank_account_id": bank["id"],
            "transaction_date": "2026-01-15",
            "posted_date": "2026-01-15",
            "transaction_type": "withdrawal",
            "amount": "-100",
            "description": "ACH Vendor B",
            "reference": payment["payment_number"],
            "source_module": "accounts_payable",
            "source_type": "supplier_payment",
            "source_id": payment["id"],
        },
    )
    assert bank_txn.status_code == 200
    reconciled = client.post(
        f"/organizations/{org['id']}/bank-transactions/{bank_txn.json()['id']}/reconcile-journal",
        headers=auth_header(tok["access_token"]),
        json={"journal_id": posted.json()["posted_journal_id"]},
    )
    assert reconciled.status_code == 200
    assert reconciled.json()["status"] == "reconciled"
    unreconciled = client.get(f"/organizations/{org['id']}/bank-transactions/unreconciled", headers=auth_header(tok["access_token"]))
    assert unreconciled.status_code == 200
    assert unreconciled.json()["items"] == []
    cash_position = client.get(f"/organizations/{org['id']}/banking/cash-position", headers=auth_header(tok["access_token"]))
    assert cash_position.status_code == 200
    item = cash_position.json()["items"][0]
    assert Decimal(str(item["ledger_balance"])) == Decimal("-100")
    assert Decimal(str(item["unreconciled_delta"])) == Decimal("0")
