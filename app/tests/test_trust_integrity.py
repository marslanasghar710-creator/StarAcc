from app.tests.test_accounting_core import auth_header, create_org_context


def _create_posted_journal(client, org_id: str, token: str):
    cash = client.post(f"/organizations/{org_id}/accounts", headers=auth_header(token), json={"code": "1000", "name": "Cash", "account_type": "asset"}).json()
    eq = client.post(f"/organizations/{org_id}/accounts", headers=auth_header(token), json={"code": "3000", "name": "Owner Equity", "account_type": "equity"}).json()

    journal = client.post(
        f"/organizations/{org_id}/journals",
        headers=auth_header(token),
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
    posted = client.post(f"/organizations/{org_id}/journals/{journal.json()['id']}/post", headers=auth_header(token))
    assert posted.status_code == 200
    return journal.json()["id"]


def test_trust_summary_and_integrity_center_shape(client):
    tokens, org = create_org_context(client, "trust-owner@example.com")

    summary = client.get(f"/api/trust/summary?organization_id={org['id']}", headers=auth_header(tokens["access_token"]))
    assert summary.status_code == 200
    payload = summary.json()
    assert payload["org_id"] == org["id"]
    assert any(domain["domain"] == "ledger_integrity" for domain in payload["domains"])
    assert any(domain["domain"] == "system_operations" for domain in payload["domains"])

    integrity = client.get(f"/api/trust/integrity-center?organization_id={org['id']}", headers=auth_header(tokens["access_token"]))
    assert integrity.status_code == 200
    center = integrity.json()
    assert "trust_summary" in center
    assert "recent_issues" in center
    assert isinstance(center["recent_issues"], list)


def test_metric_provenance_contains_context_and_effects(client):
    tokens, org = create_org_context(client, "trust-metric-owner@example.com")
    _create_posted_journal(client, org["id"], tokens["access_token"])

    response = client.get(
        f"/api/trust/metric-provenance?organization_id={org['id']}&metric_id=net_result_this_month_summary",
        headers=auth_header(tokens["access_token"]),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["metric_id"] == "net_result_this_month_summary"
    assert "source_objects" in payload
    assert "journal_effects" in payload
    assert payload["context_filters"]["accounting_basis"] == "accrual"


def test_audit_trace_returns_accounting_impacts_for_journal(client):
    tokens, org = create_org_context(client, "trust-trace-owner@example.com")
    journal_id = _create_posted_journal(client, org["id"], tokens["access_token"])

    trace = client.get(
        f"/api/trust/audit-trace?organization_id={org['id']}&source_type=journal&source_id={journal_id}",
        headers=auth_header(tokens["access_token"]),
    )
    assert trace.status_code == 200
    payload = trace.json()
    assert payload["source_type"] == "journal"
    assert len(payload["related_objects"]) >= 1
    assert len(payload["accounting_impacts"]) >= 1
    assert payload["accounting_impacts"][0]["entry_number"]
