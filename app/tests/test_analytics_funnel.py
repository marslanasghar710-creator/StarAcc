from datetime import datetime, timezone


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
        "payload": {"landing_page_id": "main", "has_utm": False},
    }

    response = client.post("/analytics/events", json=payload)
    assert response.status_code == 200
    assert response.json()["accepted"] is True
