from app.tests.test_auth_org import auth_header, register_and_login


def test_activation_snapshot_endpoint(client):
    tokens = register_and_login(client, "activation-owner@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Activation Org"}).json()

    response = client.get(
        f"/organizations/{org['id']}/activation/snapshot",
        headers=auth_header(tokens["access_token"]),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["snapshot"]["org_id"] == org["id"]
    assert payload["snapshot"]["checklist_version"] == "v1"
    assert isinstance(payload["snapshot"]["items"], list)
