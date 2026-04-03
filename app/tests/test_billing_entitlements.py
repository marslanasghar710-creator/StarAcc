from app.tests.test_auth_org import auth_header, register_and_login


def test_public_plan_catalog_endpoint(client):
    response = client.get("/public/plans")
    assert response.status_code == 200
    data = response.json()
    codes = {row["code"] for row in data}
    assert "starter" in codes
    assert "growth" in codes
    assert "advanced" in codes


def test_billing_state_auto_initializes_for_org(client):
    tokens = register_and_login(client, "billing-owner@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Billing Org"}).json()

    state = client.get(f"/organizations/{org['id']}/billing/state", headers=auth_header(tokens["access_token"]))
    assert state.status_code == 200
    payload = state.json()
    assert payload["subscription"]["plan_code"] == "starter"
    assert payload["subscription"]["status"] == "trialing"
    assert payload["limits"]["seats"] == 3


def test_payroll_run_blocked_without_entitlement(client):
    tokens = register_and_login(client, "payroll-lock@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "No Payroll"}).json()

    period = client.post(
        f"/organizations/{org['id']}/payroll-periods",
        headers=auth_header(tokens["access_token"]),
        json={"start_date": "2026-04-01", "end_date": "2026-04-30", "pay_date": "2026-05-05"},
    )
    assert period.status_code == 200

    run = client.post(
        f"/organizations/{org['id']}/payroll-runs",
        headers=auth_header(tokens["access_token"]),
        json={"payroll_period_id": period.json()["id"], "funding_account_id": "00000000-0000-0000-0000-000000000001"},
    )
    assert run.status_code == 403
    assert "not included" in run.json()["detail"]


def test_upgrade_enables_payroll_and_seat_limit_enforced(client):
    owner = register_and_login(client, "upgrade-owner@example.com")
    org = client.post("/organizations", headers=auth_header(owner["access_token"]), json={"name": "Upgrade Org"}).json()

    upgrade = client.post(
        f"/organizations/{org['id']}/billing/change-plan",
        headers=auth_header(owner["access_token"]),
        json={"plan_code": "advanced", "billing_interval": "monthly", "seats": 2},
    )
    assert upgrade.status_code == 200
    assert upgrade.json()["subscription"]["plan_code"] == "advanced"

    roles = client.get("/roles", headers=auth_header(owner["access_token"])).json()
    accountant_role = next(row for row in roles if row["name"] == "accountant")
    invite1 = client.post(
        f"/organizations/{org['id']}/invite",
        headers=auth_header(owner["access_token"]),
        json={"email": "seat1@example.com", "role_id": accountant_role["id"]},
    )
    assert invite1.status_code == 200

    invite2 = client.post(
        f"/organizations/{org['id']}/invite",
        headers=auth_header(owner["access_token"]),
        json={"email": "seat2@example.com", "role_id": accountant_role["id"]},
    )
    assert invite2.status_code == 403
