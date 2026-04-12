from app.tests.test_auth_org import auth_header, register_and_login


def test_provider_catalog_and_entitlement_visibility(client):
    tokens = register_and_login(client, "integration-owner@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Integrations Org"}).json()

    providers = client.get(f"/organizations/{org['id']}/integrations/providers", headers=auth_header(tokens["access_token"]))
    assert providers.status_code == 200
    payload = providers.json()
    assert any(row["key"] == "bank_feed_sandbox" for row in payload)
    starter_bank = next(row for row in payload if row["key"] == "bank_feed_sandbox")
    assert starter_bank["is_entitled"] is False


def test_create_connection_requires_entitlement_and_upgrade_enables(client):
    tokens = register_and_login(client, "integration-upgrade@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Integrations Upgrade Org"}).json()

    denied = client.post(
        f"/organizations/{org['id']}/integrations/connections",
        headers=auth_header(tokens["access_token"]),
        json={"provider_key": "bank_feed_sandbox", "display_name": "Primary bank", "secret_ref": "bank-token"},
    )
    assert denied.status_code == 403

    upgraded = client.post(
        f"/organizations/{org['id']}/billing/change-plan",
        headers=auth_header(tokens["access_token"]),
        json={"plan_code": "growth", "billing_interval": "monthly"},
    )
    assert upgraded.status_code == 200

    created = client.post(
        f"/organizations/{org['id']}/integrations/connections",
        headers=auth_header(tokens["access_token"]),
        json={"provider_key": "bank_feed_sandbox", "display_name": "Primary bank", "secret_ref": "bank-token"},
    )
    assert created.status_code == 200


def test_sync_and_webhook_idempotency(client):
    tokens = register_and_login(client, "integration-sync@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Integrations Sync Org"}).json()

    client.post(
        f"/organizations/{org['id']}/billing/change-plan",
        headers=auth_header(tokens["access_token"]),
        json={"plan_code": "pro", "billing_interval": "monthly"},
    )

    connection = client.post(
        f"/organizations/{org['id']}/integrations/connections",
        headers=auth_header(tokens["access_token"]),
        json={"provider_key": "contacts_sandbox", "display_name": "CRM", "secret_ref": "oauth-ref"},
    )
    assert connection.status_code == 200
    connection_id = connection.json()["id"]

    sync = client.post(
        f"/organizations/{org['id']}/integrations/connections/{connection_id}/sync",
        headers=auth_header(tokens["access_token"]),
        json={"direction": "pull"},
    )
    assert sync.status_code == 200
    assert sync.json()["status"] == "succeeded"

    first_webhook = client.post(
        "/integrations/webhooks/ingest",
        json={"provider_key": "contacts_sandbox", "event_id": "evt-1", "event_type": "contact.updated", "payload": {"id": "x"}, "signature_valid": True, "organization_id": org["id"], "connection_id": connection_id},
    )
    assert first_webhook.status_code == 200
    assert first_webhook.json()["deduped"] is False

    duplicate_webhook = client.post(
        "/integrations/webhooks/ingest",
        json={"provider_key": "contacts_sandbox", "event_id": "evt-1", "event_type": "contact.updated", "payload": {"id": "x"}, "signature_valid": True, "organization_id": org["id"], "connection_id": connection_id},
    )
    assert duplicate_webhook.status_code == 200
    assert duplicate_webhook.json()["deduped"] is True
