from datetime import datetime, timezone

from app.schemas.observability import ErrorRecord, PerformanceMetric
from app.services.observability_service import ErrorTrackingService, PerformanceMetricsService
from app.tests.test_auth_org import auth_header, register_and_login

UTC = timezone.utc


def _create_org(client, email: str):
    tokens = register_and_login(client, email)
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Obs Org"}).json()
    return tokens, org


def _invite_staff(client, owner_token: str, org_id: str, staff_email: str):
    roles = client.get("/roles", headers=auth_header(owner_token)).json()
    staff_role = next(r for r in roles if r["name"] == "staff")
    invite = client.post(
        f"/organizations/{org_id}/invite",
        headers=auth_header(owner_token),
        json={"email": staff_email, "role_id": staff_role["id"]},
    )
    assert invite.status_code == 200
    staff_tokens = register_and_login(client, staff_email)
    accepted = client.post("/invitations/accept", headers=auth_header(staff_tokens["access_token"]), json={"token": invite.json()["token"]})
    assert accepted.status_code == 200
    return staff_tokens


def test_admin_observability_permission_boundary(client):
    owner, org = _create_org(client, "obs-owner@example.com")
    staff = _invite_staff(client, owner["access_token"], org["id"], "obs-staff@example.com")

    owner_ok = client.get(f"/organizations/{org['id']}/admin/overview", headers=auth_header(owner["access_token"]))
    assert owner_ok.status_code == 200

    staff_denied = client.get(f"/organizations/{org['id']}/admin/overview", headers=auth_header(staff["access_token"]))
    assert staff_denied.status_code == 403


def test_org_health_payload_completeness_and_attention_determinism(client):
    owner, org = _create_org(client, "obs-health@example.com")

    first = client.get(f"/organizations/{org['id']}/admin/org-health", headers=auth_header(owner["access_token"]))
    assert first.status_code == 200
    payload = first.json()[0]
    assert payload["activation_status"] in {"not_started", "in_progress", "completed"}
    assert "commercial_summary" in payload
    assert "reconciliation_attention" in payload
    assert "integration_attention" in payload
    assert "trust_attention" in payload
    assert "recent_error_summary" in payload
    assert "activity_summary" in payload

    queue_a = client.get(f"/organizations/{org['id']}/admin/attention-queue", headers=auth_header(owner["access_token"]))
    queue_b = client.get(f"/organizations/{org['id']}/admin/attention-queue", headers=auth_header(owner["access_token"]))
    assert queue_a.status_code == 200
    assert queue_b.status_code == 200
    ids_a = sorted(item["item_id"] for item in queue_a.json())
    ids_b = sorted(item["item_id"] for item in queue_b.json())
    assert ids_a == ids_b


def test_admin_error_and_performance_listings(client, db):
    owner, org = _create_org(client, "obs-lists@example.com")
    now = datetime.now(UTC).isoformat()
    ErrorTrackingService(db).record(
        ErrorRecord(
            error_id="err-test-1",
            occurred_at=now,
            domain="api",
            error_class="job_failure",
            error_code="job.failed",
            severity="high",
            message="job failed",
            org_id=org["id"],
            retryable=True,
        )
    )
    PerformanceMetricsService(db).record(
        PerformanceMetric(
            metric_id="perf-test-1",
            recorded_at=now,
            domain="api",
            operation="obs.test",
            duration_ms=1820,
            status="partial",
            org_id=org["id"],
        )
    )

    errors = client.get(f"/organizations/{org['id']}/admin/errors", headers=auth_header(owner["access_token"]))
    assert errors.status_code == 200
    assert any(row["error_id"] == "err-test-1" for row in errors.json())

    perf = client.get(f"/organizations/{org['id']}/admin/performance", headers=auth_header(owner["access_token"]))
    assert perf.status_code == 200
    assert any(row["metric_id"] == "perf-test-1" for row in perf.json())

    health = client.get(f"/organizations/{org['id']}/admin/platform-health", headers=auth_header(owner["access_token"]))
    assert health.status_code == 200
    assert "domains" in health.json()

    jobs = client.get(f"/organizations/{org['id']}/admin/jobs", headers=auth_header(owner["access_token"]))
    assert jobs.status_code == 200
