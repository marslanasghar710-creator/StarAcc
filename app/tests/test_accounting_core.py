from decimal import Decimal


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def register_login(client, email):
    client.post("/auth/register", json={"email": email, "password": "StrongPass123"})
    return client.post("/auth/login", json={"email": email, "password": "StrongPass123"}).json()


def create_org_context(client, email="acct-owner@example.com"):
    tokens = register_login(client, email)
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Acct Org"}).json()
    period = client.post(
        f"/organizations/{org['id']}/periods",
        headers=auth_header(tokens["access_token"]),
        json={"name": "Jan 2026", "start_date": "2026-01-01", "end_date": "2026-01-31", "fiscal_year": 2026, "period_number": 1},
    )
    assert period.status_code == 200
    return tokens, org


def test_create_account_and_unique_code(client):
    tokens, org = create_org_context(client)
    a1 = client.post(
        f"/organizations/{org['id']}/accounts",
        headers=auth_header(tokens["access_token"]),
        json={"code": "1000", "name": "Cash", "account_type": "asset"},
    )
    assert a1.status_code == 200
    dup = client.post(
        f"/organizations/{org['id']}/accounts",
        headers=auth_header(tokens["access_token"]),
        json={"code": "1000", "name": "Cash2", "account_type": "asset"},
    )
    assert dup.status_code == 403


def test_create_balanced_journal_and_post(client):
    tokens, org = create_org_context(client, "acct-owner2@example.com")
    cash = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tokens["access_token"]), json={"code": "1000", "name": "Cash", "account_type": "asset"}).json()
    eq = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tokens["access_token"]), json={"code": "3000", "name": "Owner Equity", "account_type": "equity"}).json()

    journal = client.post(
        f"/organizations/{org['id']}/journals",
        headers=auth_header(tokens["access_token"]),
        json={
            "entry_date": "2026-01-10",
            "description": "capital",
            "lines": [
                {"account_id": cash["id"], "debit_amount": "100.00", "credit_amount": "0", "currency_code": "USD"},
                {"account_id": eq["id"], "debit_amount": "0", "credit_amount": "100.00", "currency_code": "USD"},
            ],
        },
    )
    assert journal.status_code == 200

    posted = client.post(f"/organizations/{org['id']}/journals/{journal.json()['id']}/post", headers=auth_header(tokens["access_token"]))
    assert posted.status_code == 200

    bal = client.get(f"/organizations/{org['id']}/accounts/{cash['id']}/balance", headers=auth_header(tokens["access_token"]))
    assert Decimal(str(bal.json()["closing_debit"])) == Decimal("100.00")


def test_reject_unbalanced_and_double_amount_line(client):
    tokens, org = create_org_context(client, "acct-owner3@example.com")
    cash = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tokens["access_token"]), json={"code": "1000", "name": "Cash", "account_type": "asset"}).json()
    eq = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tokens["access_token"]), json={"code": "3000", "name": "Equity", "account_type": "equity"}).json()

    bad = client.post(
        f"/organizations/{org['id']}/journals",
        headers=auth_header(tokens["access_token"]),
        json={
            "entry_date": "2026-01-10",
            "description": "bad",
            "lines": [
                {"account_id": cash["id"], "debit_amount": "100", "credit_amount": "0", "currency_code": "USD"},
                {"account_id": eq["id"], "debit_amount": "0", "credit_amount": "90", "currency_code": "USD"},
            ],
        },
    )
    assert bad.status_code in (400, 403)

    both = client.post(
        f"/organizations/{org['id']}/journals",
        headers=auth_header(tokens["access_token"]),
        json={
            "entry_date": "2026-01-10",
            "description": "bad2",
            "lines": [
                {"account_id": cash["id"], "debit_amount": "100", "credit_amount": "1", "currency_code": "USD"},
                {"account_id": eq["id"], "debit_amount": "0", "credit_amount": "101", "currency_code": "USD"},
            ],
        },
    )
    assert both.status_code == 422
