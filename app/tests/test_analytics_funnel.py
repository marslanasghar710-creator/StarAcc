from datetime import datetime, timezone


def test_funnel_event_ingestion(client):
    payload = {
        "event_name": "landing_viewed",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "anonymous_id": "anon-123",
        "session_id": "sess-123",
        "route": "/",
        "source": "direct",
        "metadata": {"page": "home"},
    }

    response = client.post("/analytics/events", json=payload)
    assert response.status_code == 200
    assert response.json()["accepted"] is True
