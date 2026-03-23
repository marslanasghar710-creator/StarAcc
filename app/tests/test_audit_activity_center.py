from app.tests.test_ai_automation_foundation import auth_header


def bootstrap_activity_org(client, email="activity-owner@example.com"):
    client.post("/auth/register", json={"email": email, "password": "StrongPass123"})
    tok = client.post("/auth/login", json={"email": email, "password": "StrongPass123"}).json()
    org = client.post("/organizations", headers=auth_header(tok["access_token"]), json={"name": "Activity Org"}).json()
    return tok, org


def invite_and_accept_viewer(client, owner_token, org_id, email="activity-viewer@example.com"):
    role_list = client.get("/roles", headers=auth_header(owner_token)).json()
    viewer_role = next(role for role in role_list if role["name"] == "viewer")
    invite = client.post(
        f"/organizations/{org_id}/invite",
        headers=auth_header(owner_token),
        json={"email": email, "role_id": viewer_role["id"]},
    )
    assert invite.status_code == 200
    client.post("/auth/register", json={"email": email, "password": "StrongPass123"})
    viewer_token = client.post("/auth/login", json={"email": email, "password": "StrongPass123"}).json()
    accepted = client.post("/invitations/accept", headers=auth_header(viewer_token["access_token"]), json={"token": invite.json()["token"]})
    assert accepted.status_code == 200
    return viewer_token


def test_activity_center_returns_summary_and_filters(client):
    tok, org = bootstrap_activity_org(client, "activity-owner1@example.com")

    created_customer = client.post(
        f"/organizations/{org['id']}/customers",
        headers=auth_header(tok["access_token"]),
        json={"display_name": "Audit Customer"},
    )
    assert created_customer.status_code == 200
    customer = created_customer.json()

    updated_customer = client.patch(
        f"/organizations/{org['id']}/customers/{customer['id']}",
        headers=auth_header(tok["access_token"]),
        json={"notes": "Updated from activity center test"},
    )
    assert updated_customer.status_code == 200

    account = client.post(
        f"/organizations/{org['id']}/accounts",
        headers=auth_header(tok["access_token"]),
        json={"code": "1000", "name": "Cash", "account_type": "asset"},
    )
    assert account.status_code == 200

    response = client.get(
        f"/organizations/{org['id']}/activity-center",
        headers=auth_header(tok["access_token"]),
        params={"entity_type": "customer", "limit": 10},
    )
    assert response.status_code == 200
    payload = response.json()

    assert payload["total_count"] >= 2
    assert payload["actor_count"] == 1
    assert payload["action_count"] >= 2
    assert payload["entity_type_count"] == 1
    assert payload["has_more"] is False
    assert all(item["entity_type"] == "customer" for item in payload["items"])
    assert any(item["action"] == "customer.created" for item in payload["items"])
    assert any(facet["value"] == "customer" for facet in payload["top_entity_types"])
    assert payload["items"][0]["actor_email"] == "activity-owner1@example.com"

    search = client.get(
        f"/organizations/{org['id']}/activity-center",
        headers=auth_header(tok["access_token"]),
        params={"q": "updated from activity center test"},
    )
    assert search.status_code == 200
    search_payload = search.json()
    assert search_payload["total_count"] >= 1
    assert all(item["metadata_json"] is None or isinstance(item["metadata_json"], dict) for item in search_payload["items"])


def test_activity_center_supports_actor_email_filter_for_members(client):
    tok, org = bootstrap_activity_org(client, "activity-owner2@example.com")
    viewer_token = invite_and_accept_viewer(client, tok["access_token"], org["id"], "activity-viewer2@example.com")

    viewer_customer = client.post(
        f"/organizations/{org['id']}/customers",
        headers=auth_header(viewer_token["access_token"]),
        json={"display_name": "Viewer Created Customer"},
    )
    assert viewer_customer.status_code == 403

    owner_customer = client.post(
        f"/organizations/{org['id']}/customers",
        headers=auth_header(tok["access_token"]),
        json={"display_name": "Owner Created Customer"},
    )
    assert owner_customer.status_code == 200

    owner_view = client.get(
        f"/organizations/{org['id']}/activity-center",
        headers=auth_header(tok["access_token"]),
        params={"actor_email": "activity-owner2@example.com"},
    )
    assert owner_view.status_code == 200
    owner_payload = owner_view.json()
    assert owner_payload["total_count"] >= 1
    assert all(item["actor_email"] == "activity-owner2@example.com" for item in owner_payload["items"])

    viewer_audit = client.get(f"/organizations/{org['id']}/activity-center", headers=auth_header(viewer_token["access_token"]))
    assert viewer_audit.status_code == 200
    assert viewer_audit.json()["total_count"] >= 1

    legacy = client.get(f"/organizations/{org['id']}/audit-logs", headers=auth_header(tok["access_token"]))
    assert legacy.status_code == 200
    assert isinstance(legacy.json(), list)
    assert len(legacy.json()) >= 2
