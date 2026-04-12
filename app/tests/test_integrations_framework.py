from app.tests.test_auth_org import auth_header, register_and_login


def _setup_org_with_bank(client, email: str):
    tokens = register_and_login(client, email)
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Integrations Org"}).json()
    client.post(
        f"/organizations/{org['id']}/billing/change-plan",
        headers=auth_header(tokens["access_token"]),
        json={"plan_code": "pro", "billing_interval": "monthly"},
    )
    cash = client.post(
        f"/organizations/{org['id']}/accounts",
        headers=auth_header(tokens["access_token"]),
        json={"code": "1000", "name": "Operating Cash", "account_type": "asset"},
    ).json()
    bank = client.post(
        f"/organizations/{org['id']}/bank-accounts",
        headers=auth_header(tokens["access_token"]),
        json={"account_id": cash["id"], "name": "Main Operating", "bank_name": "Star Bank", "account_number_mask": "****1234", "currency_code": "USD", "opening_balance": "0"},
    ).json()
    return tokens, org, bank


def test_provider_catalog_and_entitlement_visibility(client):
    tokens = register_and_login(client, "integration-owner@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Integrations Org"}).json()

    providers = client.get(f"/organizations/{org['id']}/integrations/providers", headers=auth_header(tokens["access_token"]))
    assert providers.status_code == 200
    payload = providers.json()
    assert any(row["key"] == "bank_feed_sandbox" for row in payload)
    starter_bank = next(row for row in payload if row["key"] == "bank_feed_sandbox")
    assert starter_bank["is_entitled"] is False


def test_connection_start_complete_and_disconnect(client):
    tokens = register_and_login(client, "integration-connect@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Integrations Connect Org"}).json()
    client.post(
        f"/organizations/{org['id']}/billing/change-plan",
        headers=auth_header(tokens["access_token"]),
        json={"plan_code": "growth", "billing_interval": "monthly"},
    )

    started = client.post(
        f"/organizations/{org['id']}/integrations/connect/start",
        headers=auth_header(tokens["access_token"]),
        json={"provider_id": "bank_feed_sandbox"},
    )
    assert started.status_code == 200
    assert "authorization_url" in started.json()["connection_context"]

    completed = client.post(
        f"/organizations/{org['id']}/integrations/connect/complete",
        headers=auth_header(tokens["access_token"]),
        json={"provider_id": "bank_feed_sandbox", "display_name": "Main bank", "auth_payload": {"consent": True}},
    )
    assert completed.status_code == 200
    connection_id = completed.json()["id"]

    disconnected = client.delete(
        f"/organizations/{org['id']}/integrations/connections/{connection_id}",
        headers=auth_header(tokens["access_token"]),
    )
    assert disconnected.status_code == 200
    assert disconnected.json()["message"] == "disconnected"


def test_manual_import_validation_and_deduplication(client):
    tokens, org, bank = _setup_org_with_bank(client, "integration-import@example.com")

    imported = client.post(
        f"/organizations/{org['id']}/integrations/import/bank-statement",
        headers=auth_header(tokens["access_token"]),
        json={
            "bank_account_id": bank["id"],
            "source_filename": "statement.csv",
            "csv_content": "transaction_date,description,amount,reference\n2026-04-01,Coffee,-14.20,ref-100\n2026-04-02,Client Payment,1200.00,ref-101\n",
        },
    )
    assert imported.status_code == 200
    assert imported.json()["imported_count"] == 2
    assert imported.json()["duplicate_count"] == 0
    assert imported.json()["failed_count"] == 0

    duplicate_upload = client.post(
        f"/organizations/{org['id']}/integrations/import/bank-statement",
        headers=auth_header(tokens["access_token"]),
        json={
            "bank_account_id": bank["id"],
            "source_filename": "statement.csv",
            "csv_content": "transaction_date,description,amount,reference\n2026-04-01,Coffee,-14.20,ref-100\n2026-04-02,Client Payment,1200.00,ref-101\n",
        },
    )
    assert duplicate_upload.status_code == 200
    assert duplicate_upload.json()["imported_count"] == 0
    assert duplicate_upload.json()["duplicate_count"] == 2

    invalid = client.post(
        f"/organizations/{org['id']}/integrations/import/bank-statement",
        headers=auth_header(tokens["access_token"]),
        json={
            "bank_account_id": bank["id"],
            "source_filename": "bad.csv",
            "csv_content": "wrong_date,description,amount\n2026-04-01,Coffee,-14.20\n",
        },
    )
    assert invalid.status_code == 400
    assert "missing required headers" in invalid.json()["detail"].lower()


def test_account_mapping_and_sync_status_persistence(client):
    tokens, org, bank = _setup_org_with_bank(client, "integration-sync@example.com")

    connection = client.post(
        f"/organizations/{org['id']}/integrations/connections",
        headers=auth_header(tokens["access_token"]),
        json={"provider_key": "contacts_sandbox", "display_name": "CRM", "secret_ref": "oauth-ref"},
    )
    assert connection.status_code == 200
    connection_id = connection.json()["id"]

    source_accounts = client.get(
        f"/organizations/{org['id']}/integrations/{connection_id}/source-accounts",
        headers=auth_header(tokens["access_token"]),
    )
    assert source_accounts.status_code == 200
    external_account_id = source_accounts.json()["accounts"][0]["external_account_id"]

    mapped = client.post(
        f"/organizations/{org['id']}/integrations/{connection_id}/map-account",
        headers=auth_header(tokens["access_token"]),
        json={"external_account_id": external_account_id, "bank_account_id": bank["id"]},
    )
    assert mapped.status_code == 200

    sync = client.post(
        f"/organizations/{org['id']}/integrations/connections/{connection_id}/sync",
        headers=auth_header(tokens["access_token"]),
        json={"direction": "pull"},
    )
    assert sync.status_code == 200
    assert sync.json()["status"] == "succeeded"
    assert sync.json()["records_seen"] == 5
    assert sync.json()["records_created"] >= 0
    assert sync.json()["completed_at"] is not None

    runs = client.get(
        f"/organizations/{org['id']}/integrations/connections/{connection_id}/sync-runs",
        headers=auth_header(tokens["access_token"]),
    )
    assert runs.status_code == 200
    assert len(runs.json()) >= 1
    latest = runs.json()[0]
    assert latest["status"] in {"succeeded", "partial"}
    assert latest["started_at"] is not None
    assert latest["completed_at"] is not None


def test_webhook_idempotency(client):
    tokens, org, _ = _setup_org_with_bank(client, "integration-webhook@example.com")
    connection = client.post(
        f"/organizations/{org['id']}/integrations/connections",
        headers=auth_header(tokens["access_token"]),
        json={"provider_key": "contacts_sandbox", "display_name": "CRM", "secret_ref": "oauth-ref"},
    ).json()

    first_webhook = client.post(
        "/integrations/webhooks/ingest",
        json={"provider_key": "contacts_sandbox", "event_id": "evt-1", "event_type": "contact.updated", "payload": {"id": "x"}, "signature_valid": True, "organization_id": org["id"], "connection_id": connection["id"]},
    )
    assert first_webhook.status_code == 200
    assert first_webhook.json()["deduped"] is False

    duplicate_webhook = client.post(
        "/integrations/webhooks/ingest",
        json={"provider_key": "contacts_sandbox", "event_id": "evt-1", "event_type": "contact.updated", "payload": {"id": "x"}, "signature_valid": True, "organization_id": org["id"], "connection_id": connection["id"]},
    )
    assert duplicate_webhook.status_code == 200
    assert duplicate_webhook.json()["deduped"] is True
