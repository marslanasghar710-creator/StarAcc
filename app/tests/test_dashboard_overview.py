from app.tests.test_auth_org import auth_header, register_and_login


def test_dashboard_overview_returns_structured_payload(client):
    tokens = register_and_login(client, "dashboard-owner@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Dashboard Org"}).json()

    response = client.get(
        f"/organizations/{org['id']}/dashboard/overview",
        headers=auth_header(tokens["access_token"]),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["maturity"] in ["new", "active", "mature"]
    assert len(payload["summary_metrics"]) == 6
    assert "attention_items" in payload
    assert "trends" in payload
    assert "aging" in payload
    assert "workflows" in payload
    assert "recent_activity" in payload
    assert "recommendations" in payload
