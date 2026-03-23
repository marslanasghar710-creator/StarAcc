from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient
from decimal import Decimal

from app.core.enums import AccountType
from app.main import app
from app.core.security import create_access_token
from app.tests.test_reporting_core import (
    add_membership,
    auth_header,
    create_account,
    create_org_with_membership,
    create_posted_journal,
    create_user,
)


def setup_entity(db, owner, name: str, currency: str = "USD"):
    org, period = create_org_with_membership(db, owner, name)
    org.base_currency = currency
    cash = create_account(db, org, "1000", "Cash", AccountType.ASSET)
    ar = create_account(db, org, "1100", "Intercompany Receivable", AccountType.ASSET)
    ap = create_account(db, org, "2100", "Intercompany Payable", AccountType.LIABILITY)
    equity = create_account(db, org, "3000", "Equity", AccountType.EQUITY)
    sales = create_account(db, org, "4000", "Sales", AccountType.REVENUE)
    expense = create_account(db, org, "5000", "Expense", AccountType.EXPENSE)
    db.flush()
    return org, period, {
        "cash": cash,
        "ar": ar,
        "ap": ap,
        "equity": equity,
        "sales": sales,
        "expense": expense,
    }


def tag_intercompany(journal, pair_key: str):
    journal.reference = pair_key
    journal.source_type = "intercompany_journal"
    journal.metadata_json = {"is_intercompany": True, "intercompany_pair_key": pair_key}


def test_consolidation_run_reports_and_elimination_balancing(client, db):
    owner = create_user(db, "consolidation-owner@example.com")
    parent_org, parent_period, parent_accounts = setup_entity(db, owner, "Parent Co")
    child_org, child_period, child_accounts = setup_entity(db, owner, "Child Co")

    create_posted_journal(
        db,
        parent_org,
        parent_period,
        owner,
        "JNL-P-001",
        date(2026, 1, 2),
        "Parent capital",
        [
            {"account_id": parent_accounts["cash"].id, "debit": Decimal("1000.00")},
            {"account_id": parent_accounts["equity"].id, "credit": Decimal("1000.00")},
        ],
    )
    create_posted_journal(
        db,
        parent_org,
        parent_period,
        owner,
        "JNL-P-002",
        date(2026, 1, 15),
        "External sale",
        [
            {"account_id": parent_accounts["cash"].id, "debit": Decimal("300.00")},
            {"account_id": parent_accounts["sales"].id, "credit": Decimal("300.00")},
        ],
    )
    interco_parent = create_posted_journal(
        db,
        parent_org,
        parent_period,
        owner,
        "JNL-P-003",
        date(2026, 1, 20),
        "Intercompany sale",
        [
            {"account_id": parent_accounts["ar"].id, "debit": Decimal("200.00")},
            {"account_id": parent_accounts["sales"].id, "credit": Decimal("200.00")},
        ],
    )
    tag_intercompany(interco_parent, "IC-REV-001")

    create_posted_journal(
        db,
        child_org,
        child_period,
        owner,
        "JNL-C-001",
        date(2026, 1, 3),
        "Child capital",
        [
            {"account_id": child_accounts["cash"].id, "debit": Decimal("500.00")},
            {"account_id": child_accounts["equity"].id, "credit": Decimal("500.00")},
        ],
    )
    interco_child = create_posted_journal(
        db,
        child_org,
        child_period,
        owner,
        "JNL-C-002",
        date(2026, 1, 20),
        "Intercompany purchase",
        [
            {"account_id": child_accounts["expense"].id, "debit": Decimal("200.00")},
            {"account_id": child_accounts["ap"].id, "credit": Decimal("200.00")},
        ],
    )
    tag_intercompany(interco_child, "IC-REV-001")
    db.commit()

    token = create_access_token(str(owner.id))
    group = client.post(
        f"/organizations/{parent_org.id}/groups",
        headers=auth_header(token),
        json={"name": "North America Group", "reporting_currency": "USD", "description": "Consolidated reporting scope"},
    )
    assert group.status_code == 200
    group_id = group.json()["id"]

    add_parent = client.post(f"/groups/{group_id}/entities", headers=auth_header(token), json={"organization_id": str(parent_org.id), "is_primary": True})
    add_child = client.post(f"/groups/{group_id}/entities", headers=auth_header(token), json={"organization_id": str(child_org.id)})
    assert add_parent.status_code == 200
    assert add_child.status_code == 200

    run = client.post(
        f"/groups/{group_id}/consolidations/run",
        headers=auth_header(token),
        json={"period_start": "2026-01-01", "period_end": "2026-01-31"},
    )
    assert run.status_code == 200
    payload = run.json()
    assert payload["status"] == "completed"
    rerun = client.post(
        f"/groups/{group_id}/consolidations/run",
        headers=auth_header(token),
        json={"period_start": "2026-01-01", "period_end": "2026-01-31"},
    )
    assert rerun.status_code == 200
    assert rerun.json()["id"] == payload["id"]
    assert payload["elimination_summary"]["auto_count"] >= 1
    assert Decimal(payload["income_statement"]["revenue"]["total"]) == Decimal("300.00")
    assert Decimal(payload["income_statement"]["expenses"]["total"]) == Decimal("0")
    assert Decimal(payload["income_statement"]["net_profit"]) == Decimal("300.00")
    assert payload["trial_balance"]["balances"] is True
    assert payload["balance_sheet"]["balances"] is True

    runs = client.get(f"/groups/{group_id}/consolidations?limit=10&offset=0", headers=auth_header(token))
    assert runs.status_code == 200
    assert runs.json()["pagination"]["total"] == 1

    eliminations = client.get(f"/groups/{group_id}/eliminations?limit=10&offset=0", headers=auth_header(token))
    assert eliminations.status_code == 200
    assert eliminations.json()["pagination"]["total"] >= 1
    first_entry = eliminations.json()["items"][0]
    debit_total = sum(Decimal(line["debit_amount"]) for line in first_entry["journal_lines"])
    credit_total = sum(Decimal(line["credit_amount"]) for line in first_entry["journal_lines"])
    assert debit_total == credit_total


def test_manual_elimination_validation_and_fx_requirements(client, db):
    owner = create_user(db, "consolidation-fx-owner@example.com")
    parent_org, _period, _accounts = setup_entity(db, owner, "USD Parent")
    foreign_org, foreign_period, foreign_accounts = setup_entity(db, owner, "EUR Child", currency="EUR")

    create_posted_journal(
        db,
        foreign_org,
        foreign_period,
        owner,
        "JNL-E-001",
        date(2026, 1, 5),
        "Foreign capital",
        [
            {"account_id": foreign_accounts["cash"].id, "debit": Decimal("120.00")},
            {"account_id": foreign_accounts["equity"].id, "credit": Decimal("120.00")},
        ],
    )
    db.commit()

    token = create_access_token(str(owner.id))
    group_id = client.post(
        f"/organizations/{parent_org.id}/groups",
        headers=auth_header(token),
        json={"name": "FX Group", "reporting_currency": "USD"},
    ).json()["id"]
    client.post(f"/groups/{group_id}/entities", headers=auth_header(token), json={"organization_id": str(parent_org.id), "is_primary": True})
    client.post(f"/groups/{group_id}/entities", headers=auth_header(token), json={"organization_id": str(foreign_org.id)})

    unbalanced = client.post(
        f"/groups/{group_id}/eliminations",
        headers=auth_header(token),
        json={
            "description": "Broken entry",
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "source_entities": [str(parent_org.id)],
            "journal_lines": [
                {"account_code": "4000", "account_name": "Sales", "account_type": "revenue", "debit_amount": "10.00", "credit_amount": "0"},
                {"account_code": "5000", "account_name": "Expense", "account_type": "expense", "debit_amount": "0", "credit_amount": "9.00"},
            ],
        },
    )
    assert unbalanced.status_code == 422

    balanced = client.post(
        f"/groups/{group_id}/eliminations",
        headers=auth_header(token),
        json={
            "description": "Manual true-up",
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "source_entities": [str(parent_org.id)],
            "journal_lines": [
                {"account_code": "4000", "account_name": "Sales", "account_type": "revenue", "debit_amount": "10.00", "credit_amount": "0"},
                {"account_code": "5000", "account_name": "Expense", "account_type": "expense", "debit_amount": "0", "credit_amount": "10.00"},
            ],
        },
    )
    assert balanced.status_code == 200
    assert balanced.json()["is_manual"] is True

    missing_fx = client.post(
        f"/groups/{group_id}/consolidations/run",
        headers=auth_header(token),
        json={"period_start": "2026-01-01", "period_end": "2026-01-31"},
    )
    assert missing_fx.status_code == 403
    assert "FX rate" in missing_fx.json()["detail"]

    with_fx = client.post(
        f"/groups/{group_id}/consolidations/run",
        headers=auth_header(token),
        json={
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "fx_rates": [{"organization_id": str(foreign_org.id), "rate": "1.25"}],
        },
    )
    assert with_fx.status_code == 200
    assert with_fx.json()["status"] == "completed"


def test_consolidation_permissions_and_org_isolation(client, db):
    owner = create_user(db, "consolidation-sec-owner@example.com")
    viewer = create_user(db, "consolidation-sec-viewer@example.com")
    staff = create_user(db, "consolidation-sec-staff@example.com")
    outsider_owner = create_user(db, "consolidation-outsider-owner@example.com")

    parent_org, _period, _accounts = setup_entity(db, owner, "Secure Parent")
    inaccessible_org, _foreign_period, _foreign_accounts = setup_entity(db, outsider_owner, "Inaccessible Org")

    add_membership(db, viewer, parent_org, "viewer")
    add_membership(db, staff, parent_org, "staff")
    db.commit()

    owner_token = create_access_token(str(owner.id))
    viewer_token = create_access_token(str(viewer.id))
    staff_token = create_access_token(str(staff.id))

    create_group = client.post(
        f"/organizations/{parent_org.id}/groups",
        headers=auth_header(owner_token),
        json={"name": "Secure Group", "reporting_currency": "USD"},
    )
    assert create_group.status_code == 200
    group_id = create_group.json()["id"]

    viewer_list = client.get(f"/organizations/{parent_org.id}/groups", headers=auth_header(viewer_token))
    assert viewer_list.status_code == 200

    viewer_create = client.post(
        f"/organizations/{parent_org.id}/groups",
        headers=auth_header(viewer_token),
        json={"name": "Viewer Blocked", "reporting_currency": "USD"},
    )
    assert viewer_create.status_code == 403

    staff_list = client.get(f"/organizations/{parent_org.id}/groups", headers=auth_header(staff_token))
    assert staff_list.status_code == 403

    forbidden_entity = client.post(
        f"/groups/{group_id}/entities",
        headers=auth_header(owner_token),
        json={"organization_id": str(inaccessible_org.id)},
    )
    assert forbidden_entity.status_code == 403


def test_health_returns_request_id_header():
    with TestClient(app) as test_client:
        response = test_client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID")
