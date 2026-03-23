from __future__ import annotations

from decimal import Decimal

from app.core.security import create_access_token
from app.tests.test_reporting_core import add_membership, auth_header, create_user, setup_reporting_fixture


def test_custom_report_preview_create_run_and_export(client, db):
    owner, org, _accounts = setup_reporting_fixture(db)
    token = create_access_token(str(owner.id))

    preview = client.post(
        f"/organizations/{org.id}/custom-reports/preview",
        headers=auth_header(token),
        json={
            "dataset_id": "journal_lines",
            "columns": ["source_module", "net_amount"],
            "filters": [{"field": "entry_date", "operator": "between", "value": "2026-01-01", "value_to": "2026-02-28"}],
            "groupings": ["source_module"],
            "sorting": [{"field": "source_module", "direction": "asc"}],
            "page": 1,
            "page_size": 50,
        },
    )
    assert preview.status_code == 200
    preview_payload = preview.json()
    assert preview_payload["dataset"]["id"] == "journal_lines"
    rows = {row["source_module"]: Decimal(str(row["net_amount"])) for row in preview_payload["rows"]}
    assert rows["ar"] == Decimal("200.00")
    assert rows["ap"] == Decimal("20.00")
    assert preview_payload["totals"]["net_amount"] is not None

    created = client.post(
        f"/organizations/{org.id}/custom-reports",
        headers=auth_header(token),
        json={
            "name": "Journal activity by module",
            "description": "Summarize posted journal movement by source module.",
            "dataset_id": "journal_lines",
            "columns": ["source_module", "net_amount"],
            "filters": [{"field": "entry_date", "operator": "between", "value": "2026-01-01", "value_to": "2026-02-28"}],
            "groupings": ["source_module"],
            "sorting": [{"field": "source_module", "direction": "asc"}],
            "display_options": {"visibility": "organization"},
        },
    )
    assert created.status_code == 200
    report_id = created.json()["id"]

    run = client.post(f"/organizations/{org.id}/custom-reports/{report_id}/run", headers=auth_header(token))
    assert run.status_code == 200
    assert run.json()["report_definition_id"] == report_id

    export = client.post(
        f"/organizations/{org.id}/custom-reports/{report_id}/export",
        headers=auth_header(token),
        json={
            "dataset_id": "journal_lines",
            "columns": ["source_module", "net_amount"],
            "filters": [{"field": "entry_date", "operator": "between", "value": "2026-01-01", "value_to": "2026-02-28"}],
            "groupings": ["source_module"],
            "sorting": [{"field": "source_module", "direction": "asc"}],
            "page": 1,
            "page_size": 100,
            "export_format": "csv",
        },
    )
    assert export.status_code == 200
    assert export.headers["content-type"].startswith("text/csv")
    assert "rows.source_module" in export.text


def test_custom_report_definition_validation_permissions_and_org_isolation(client, db):
    owner, org, _accounts = setup_reporting_fixture(db)
    viewer = create_user(db, "custom-viewer@example.com")
    staff = create_user(db, "custom-staff@example.com")
    outsider = create_user(db, "custom-outsider@example.com")
    add_membership(db, viewer, org, "viewer")
    add_membership(db, staff, org, "staff")
    db.commit()

    owner_token = create_access_token(str(owner.id))
    viewer_token = create_access_token(str(viewer.id))
    staff_token = create_access_token(str(staff.id))
    outsider_token = create_access_token(str(outsider.id))

    datasets = client.get(f"/organizations/{org.id}/custom-reports/datasets", headers=auth_header(viewer_token))
    assert datasets.status_code == 200
    dataset_ids = {item["id"] for item in datasets.json()}
    assert "accounts" in dataset_ids
    assert "journal_lines" in dataset_ids

    forbidden_create = client.post(
        f"/organizations/{org.id}/custom-reports",
        headers=auth_header(viewer_token),
        json={
            "name": "Viewer cannot save",
            "dataset_id": "accounts",
            "columns": ["account_code", "current_balance"],
            "filters": [],
            "groupings": [],
            "sorting": [],
        },
    )
    assert forbidden_create.status_code == 403

    no_access = client.get(f"/organizations/{org.id}/custom-reports", headers=auth_header(staff_token))
    assert no_access.status_code == 403

    invalid_preview = client.post(
        f"/organizations/{org.id}/custom-reports/preview",
        headers=auth_header(owner_token),
        json={
            "dataset_id": "accounts",
            "columns": ["not_a_real_field"],
            "filters": [],
            "groupings": [],
            "sorting": [],
            "page": 1,
            "page_size": 50,
        },
    )
    assert invalid_preview.status_code == 422

    cross_org = client.get(f"/organizations/{org.id}/custom-reports", headers=auth_header(outsider_token))
    assert cross_org.status_code == 403


