from app.tests.test_auth_org import auth_header, register_and_login


def test_dashboard_overview_returns_widget_envelope_payload(client):
    tokens = register_and_login(client, "dashboard-owner@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Dashboard Org"}).json()

    response = client.get(
        f"/organizations/{org['id']}/dashboard/overview",
        headers=auth_header(tokens["access_token"]),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["organizationId"] == org["id"]
    assert payload["dashboardContext"]["scopeType"] == "organization"
    assert isinstance(payload["widgets"], list)
    assert any(widget["widgetKey"] == "cash_position_summary" for widget in payload["widgets"])
