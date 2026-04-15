from datetime import datetime, timezone

import pytest


def test_funnel_event_ingestion(client):
    payload = {
        "event_name": "marketing.landing.viewed",
        "event_version": 1,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "anonymous_id": "anon-123",
        "session_id": "sess-123",
        "route": "/",
        "funnel_domain": "acquisition",
        "funnel_stage": "acquired",
        "is_demo": False,
        "is_authenticated": False,
        "payload": {"landing_page_id": "main", "has_utm": False},
    }

    response = client.post("/analytics/events", json=payload)
    assert response.status_code == 200
    assert response.json()["accepted"] is True


@pytest.mark.parametrize(
    ("stage", "expected_status"),
    [
        ("acquired", 200),
        ("engaged", 200),
        ("demo_entered", 200),
        ("signup_started", 200),
        ("authenticated", 200),
        ("workspace_started", 200),
        ("workspace_created", 200),
        ("activation_started", 200),
        ("activated", 200),
        ("handoff_to_app", 200),
        ("invalid_stage", 422),
    ],
)
def test_funnel_stage_schema_is_canonical(client, stage, expected_status):
    payload = {
        "event_name": "marketing.section.viewed",
        "event_version": 1,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "anonymous_id": "anon-123",
        "session_id": "sess-123",
        "route": "/",
        "funnel_domain": "acquisition",
        "funnel_stage": stage,
        "is_demo": False,
        "is_authenticated": False,
        "payload": {"section_id": "hero"},
    }
    response = client.post("/analytics/events", json=payload)
    assert response.status_code == expected_status
