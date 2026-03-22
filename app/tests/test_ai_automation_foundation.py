from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.core.config import settings

UTC = timezone.utc


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def bootstrap_ai(client, email="ai-owner@example.com"):
    client.post("/auth/register", json={"email": email, "password": "StrongPass123"})
    tok = client.post("/auth/login", json={"email": email, "password": "StrongPass123"}).json()
    org = client.post("/organizations", headers=auth_header(tok["access_token"]), json={"name": "AI Org"}).json()
    client.post(
        f"/organizations/{org['id']}/periods",
        headers=auth_header(tok["access_token"]),
        json={"name": "Jan 2026", "start_date": "2026-01-01", "end_date": "2026-01-31", "fiscal_year": 2026, "period_number": 1},
    )
    cash = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "1000", "name": "Operating Cash", "account_type": "asset"}).json()
    expense = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "6100", "name": "Rent Expense", "account_type": "expense"}).json()
    payroll_expense = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "6200", "name": "Payroll Expense", "account_type": "expense"}).json()
    bank = client.post(
        f"/organizations/{org['id']}/bank-accounts",
        headers=auth_header(tok["access_token"]),
        json={"account_id": cash["id"], "name": "Main Account", "bank_name": "Star Bank", "account_number_mask": "****9999", "currency_code": "USD", "opening_balance": "0"},
    ).json()
    return tok, org, {"cash": cash, "expense": expense, "payroll_expense": payroll_expense, "bank": bank}


def create_bank_transaction(client, token, org_id, bank_account_id, description, amount="-1250.00"):
    return client.post(
        f"/organizations/{org_id}/bank-transactions",
        headers=auth_header(token),
        json={
            "bank_account_id": bank_account_id,
            "transaction_date": "2026-01-15",
            "posted_date": "2026-01-15",
            "transaction_type": "withdrawal",
            "amount": amount,
            "description": description,
            "reference": "AUTO-TEST",
        },
    ).json()


def test_automation_rule_crud_priority_and_generation(client):
    tok, org, accounts = bootstrap_ai(client, "ai-owner1@example.com")
    txn = create_bank_transaction(client, tok["access_token"], org["id"], accounts["bank"]["id"], "Office rent payment")

    low_priority = client.post(
        f"/organizations/{org['id']}/automation-rules",
        headers=auth_header(tok["access_token"]),
        json={
            "rule_type": "bank_transaction_categorization",
            "name": "Low priority rent rule",
            "priority": 50,
            "conditions_json": {"all": [{"field": "description", "operator": "contains", "value": "rent"}]},
            "actions_json": {"suggestion_type": "bank_transaction_coding", "reason_summary": "Low priority match", "suggestion_payload": {"target_account_id": accounts["payroll_expense"]["id"]}},
        },
    )
    assert low_priority.status_code == 200

    high_priority = client.post(
        f"/organizations/{org['id']}/automation-rules",
        headers=auth_header(tok["access_token"]),
        json={
            "rule_type": "bank_transaction_categorization",
            "name": "High priority rent rule",
            "priority": 5,
            "conditions_json": {"all": [{"field": "description", "operator": "contains", "value": "rent"}]},
            "actions_json": {"suggestion_type": "bank_transaction_coding", "reason_summary": "High priority match", "suggestion_payload": {"target_account_id": accounts["expense"]["id"]}},
        },
    )
    assert high_priority.status_code == 200

    listed = client.get(f"/organizations/{org['id']}/automation-rules", headers=auth_header(tok["access_token"]))
    assert listed.status_code == 200
    assert [item["name"] for item in listed.json()["items"]][:2] == ["High priority rent rule", "Low priority rent rule"]

    tested = client.post(
        f"/organizations/{org['id']}/automation-rules/{high_priority.json()['id']}/test",
        headers=auth_header(tok["access_token"]),
        json={"target_payload": {"description": "January rent for HQ"}},
    )
    assert tested.status_code == 200
    assert tested.json()["matched"] is True

    generated = client.post(
        f"/organizations/{org['id']}/bank-transactions/{txn['id']}/generate-suggestions",
        headers=auth_header(tok["access_token"]),
    )
    assert generated.status_code == 200
    assert generated.json()["generation_status"] == "succeeded"

    suggestions = client.get(
        f"/organizations/{org['id']}/bank-transactions/{txn['id']}/suggestions",
        headers=auth_header(tok["access_token"]),
    )
    assert suggestions.status_code == 200
    items = suggestions.json()["items"]
    rule_suggestions = [item for item in items if item["source_type"] == "rule"]
    assert len(rule_suggestions) == 1
    assert rule_suggestions[0]["reason_summary"] == "High priority match"
    assert rule_suggestions[0]["suggested_payload_json"]["matched_rule_id"] == high_priority.json()["id"]


def test_document_extraction_jobs_and_permissions(client):
    tok, org, accounts = bootstrap_ai(client, "ai-owner2@example.com")
    upload = client.post(
        f"/organizations/{org['id']}/files/upload",
        headers=auth_header(tok["access_token"]),
        files={"upload": ("invoice-sample.txt", b"Invoice Number: INV-100\nTotal: 123.45\nTax: 23.45\nIssue Date: 2026-01-10", "text/plain")},
    )
    assert upload.status_code == 200
    file_id = upload.json()["file"]["id"]

    extraction = client.post(
        f"/organizations/{org['id']}/document-intelligence/extract",
        headers=auth_header(tok["access_token"]),
        json={"file_id": file_id},
    )
    assert extraction.status_code == 200
    extraction_job = extraction.json()
    assert extraction_job["status"] == "succeeded"
    assert extraction_job["classifier_label"] == "invoice"
    assert extraction_job["extracted_fields_json"]["invoice_number"] == "inv-100"

    jobs = client.get(f"/organizations/{org['id']}/ai-jobs", headers=auth_header(tok["access_token"]))
    assert jobs.status_code == 200
    assert any(job["job_type"] == "document_extraction" for job in jobs.json()["items"])

    role_list = client.get("/roles", headers=auth_header(tok["access_token"])).json()
    viewer_role = next(role for role in role_list if role["name"] == "viewer")
    invite = client.post(
        f"/organizations/{org['id']}/invite",
        headers=auth_header(tok["access_token"]),
        json={"email": "ai-viewer@example.com", "role_id": viewer_role["id"]},
    )
    client.post("/auth/register", json={"email": "ai-viewer@example.com", "password": "StrongPass123"})
    viewer_token = client.post("/auth/login", json={"email": "ai-viewer@example.com", "password": "StrongPass123"}).json()
    client.post("/invitations/accept", headers=auth_header(viewer_token["access_token"]), json={"token": invite.json()["token"]})

    assert client.get(f"/organizations/{org['id']}/document-intelligence/jobs", headers=auth_header(viewer_token["access_token"])).status_code == 200
    assert client.post(
        f"/organizations/{org['id']}/document-intelligence/extract",
        headers=auth_header(viewer_token["access_token"]),
        json={"file_id": file_id},
    ).status_code == 403


def test_suggestion_accept_reject_staleness_and_safe_apply(client, db):
    tok, org, accounts = bootstrap_ai(client, "ai-owner3@example.com")
    txn = create_bank_transaction(client, tok["access_token"], org["id"], accounts["bank"]["id"], "Payroll clearing transfer")
    rule = client.post(
        f"/organizations/{org['id']}/automation-rules",
        headers=auth_header(tok["access_token"]),
        json={
            "rule_type": "bank_transaction_categorization",
            "name": "Payroll coding rule",
            "priority": 1,
            "conditions_json": {"all": [{"field": "description", "operator": "contains", "value": "payroll"}]},
            "actions_json": {"suggestion_type": "bank_transaction_coding", "reason_summary": "Route payroll bank lines", "suggestion_payload": {"target_account_id": accounts["payroll_expense"]["id"]}, "auto_apply_safe": True},
        },
    )
    assert rule.status_code == 200

    client.post(
        f"/organizations/{org['id']}/bank-transactions/{txn['id']}/generate-suggestions",
        headers=auth_header(tok["access_token"]),
    )
    suggestions = client.get(f"/organizations/{org['id']}/bank-transactions/{txn['id']}/suggestions", headers=auth_header(tok["access_token"])).json()["items"]
    suggestion = next(item for item in suggestions if item["source_type"] == "rule")

    original_auto_apply = settings.ai_auto_apply_safe_workflows
    settings.ai_auto_apply_safe_workflows = True
    try:
        accepted = client.post(
            f"/organizations/{org['id']}/suggestions/{suggestion['id']}/accept",
            headers=auth_header(tok["access_token"]),
            json={"feedback_reason": "Looks correct"},
        )
    finally:
        settings.ai_auto_apply_safe_workflows = original_auto_apply
    assert accepted.status_code == 200
    refreshed_txn = client.get(f"/organizations/{org['id']}/bank-transactions/{txn['id']}", headers=auth_header(tok["access_token"])).json()
    assert refreshed_txn["target_account_id"] == accounts["payroll_expense"]["id"]
    accepted_suggestion = client.get(f"/organizations/{org['id']}/suggestions/{suggestion['id']}", headers=auth_header(tok["access_token"])).json()
    assert accepted_suggestion["status"] == "applied"
    assert accepted_suggestion["applied_at"] is not None

    txn2 = create_bank_transaction(client, tok["access_token"], org["id"], accounts["bank"]["id"], "Office rent payment")
    client.post(
        f"/organizations/{org['id']}/bank-transactions/{txn2['id']}/generate-suggestions",
        headers=auth_header(tok["access_token"]),
    )
    second = client.get(f"/organizations/{org['id']}/bank-transactions/{txn2['id']}/suggestions", headers=auth_header(tok["access_token"])).json()["items"][0]
    rejected = client.post(
        f"/organizations/{org['id']}/suggestions/{second['id']}/reject",
        headers=auth_header(tok["access_token"]),
        json={"feedback_reason": "Not appropriate"},
    )
    assert rejected.status_code == 200
    rejected_suggestion = client.get(f"/organizations/{org['id']}/suggestions/{second['id']}", headers=auth_header(tok["access_token"])).json()
    assert rejected_suggestion["status"] == "rejected"

    from app.core.enums import SuggestionStatus
    from app.db.models import Suggestion

    stale = db.get(Suggestion, suggestion["id"])
    stale.status = SuggestionStatus.PENDING
    stale.applied_at = None
    stale.reviewed_at = None
    stale.reviewed_by = None
    stale.expires_at = datetime.now(UTC) - timedelta(days=1)
    db.commit()
    stale_accept = client.post(
        f"/organizations/{org['id']}/suggestions/{suggestion['id']}/accept",
        headers=auth_header(tok["access_token"]),
        json={},
    )
    assert stale_accept.status_code == 403
