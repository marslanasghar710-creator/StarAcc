from decimal import Decimal

from app.db.models import AccountingSettings, ProjectCostEntry, ProjectRevenueEntry, User


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def bootstrap_projects(client, db, email="projects-owner@example.com"):
    client.post("/auth/register", json={"email": email, "password": "StrongPass123"})
    tok = client.post("/auth/login", json={"email": email, "password": "StrongPass123"}).json()
    org = client.post("/organizations", headers=auth_header(tok["access_token"]), json={"name": "Projects Org"}).json()
    client.post(
        f"/organizations/{org['id']}/periods",
        headers=auth_header(tok["access_token"]),
        json={"name": "Jan 2026", "start_date": "2026-01-01", "end_date": "2026-01-31", "fiscal_year": 2026, "period_number": 1},
    )
    ar = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "1100", "name": "Accounts Receivable", "account_type": "asset"}).json()
    ap = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "2100", "name": "Accounts Payable", "account_type": "liability"}).json()
    revenue = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "4000", "name": "Services Revenue", "account_type": "revenue"}).json()
    expense = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "5000", "name": "Project Costs", "account_type": "expense"}).json()
    cash = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "1000", "name": "Cash", "account_type": "asset"}).json()
    db.add(
        AccountingSettings(
            organization_id=org["id"],
            accounts_receivable_control_account_id=ar["id"],
            default_sales_revenue_account_id=revenue["id"],
            default_customer_receipts_account_id=cash["id"],
            accounts_payable_control_account_id=ap["id"],
            default_expense_account_id=expense["id"],
            default_supplier_payments_account_id=cash["id"],
        )
    )
    db.commit()
    owner_user = db.query(User).filter(User.email == email).one()
    return tok, org, owner_user, {"ar": ar, "ap": ap, "revenue": revenue, "expense": expense, "cash": cash}


def test_project_crud_permissions_and_time_entry_guardrails(client, db):
    tok, org, owner_user, accounts = bootstrap_projects(client, db, "projects-owner1@example.com")
    customer = client.post(f"/organizations/{org['id']}/customers", headers=auth_header(tok["access_token"]), json={"display_name": "Acme Client"}).json()

    project_response = client.post(
        f"/organizations/{org['id']}/projects",
        headers=auth_header(tok["access_token"]),
        json={
            "code": "PRJ-001",
            "name": "Acme Implementation",
            "customer_id": customer["id"],
            "owner_user_id": str(owner_user.id),
            "budget_revenue": "5000.00",
            "budget_cost": "3000.00",
            "budget_hours": "120.00",
        },
    )
    assert project_response.status_code == 200
    project = project_response.json()
    assert project["code"] == "PRJ-001"
    assert project["status"] == "draft"

    duplicate = client.post(
        f"/organizations/{org['id']}/projects",
        headers=auth_header(tok["access_token"]),
        json={"code": "PRJ-001", "name": "Duplicate"},
    )
    assert duplicate.status_code == 403

    budget_update = client.patch(
        f"/organizations/{org['id']}/projects/{project['id']}/budget",
        headers=auth_header(tok["access_token"]),
        json={"budget_cost": "3200.00", "budget_hours": "140.00", "currency_code": "USD"},
    )
    assert budget_update.status_code == 200
    assert Decimal(str(budget_update.json()["budget_cost"])) == Decimal("3200.00")

    activated = client.patch(
        f"/organizations/{org['id']}/projects/{project['id']}",
        headers=auth_header(tok["access_token"]),
        json={"status": "active", "description": "Customer-facing delivery"},
    )
    assert activated.status_code == 200
    assert activated.json()["status"] == "active"

    time_entry = client.post(
        f"/organizations/{org['id']}/projects/{project['id']}/time-entries",
        headers=auth_header(tok["access_token"]),
        json={"user_id": str(owner_user.id), "entry_date": "2026-01-10", "hours": "3.50", "cost_rate": "80.00", "billing_rate": "120.00", "description": "Discovery workshop"},
    )
    assert time_entry.status_code == 200

    period_list = client.get(f"/organizations/{org['id']}/periods", headers=auth_header(tok["access_token"])).json()["items"]
    jan_period = period_list[0]
    assert client.post(f"/organizations/{org['id']}/periods/{jan_period['id']}/close", headers=auth_header(tok["access_token"])).status_code == 200

    closed_time_entry = client.post(
        f"/organizations/{org['id']}/projects/{project['id']}/time-entries",
        headers=auth_header(tok["access_token"]),
        json={"user_id": str(owner_user.id), "entry_date": "2026-01-15", "hours": "1.00", "description": "Late entry"},
    )
    assert closed_time_entry.status_code == 403

    archived = client.delete(f"/organizations/{org['id']}/projects/{project['id']}", headers=auth_header(tok["access_token"]))
    assert archived.status_code == 200

    archived_time_entry = client.post(
        f"/organizations/{org['id']}/projects/{project['id']}/time-entries",
        headers=auth_header(tok["access_token"]),
        json={"user_id": str(owner_user.id), "entry_date": "2026-02-01", "hours": "1.00", "description": "Blocked after archive"},
    )
    assert archived_time_entry.status_code == 403

    role_list = client.get("/roles", headers=auth_header(tok["access_token"])).json()
    viewer_role = next(role for role in role_list if role["name"] == "viewer")
    invite = client.post(
        f"/organizations/{org['id']}/invite",
        headers=auth_header(tok["access_token"]),
        json={"email": "projects-viewer@example.com", "role_id": viewer_role["id"]},
    )
    assert invite.status_code == 200
    client.post("/auth/register", json={"email": "projects-viewer@example.com", "password": "StrongPass123"})
    viewer_token = client.post("/auth/login", json={"email": "projects-viewer@example.com", "password": "StrongPass123"}).json()
    accepted = client.post("/invitations/accept", headers=auth_header(viewer_token["access_token"]), json={"token": invite.json()["token"]})
    assert accepted.status_code == 200

    viewer_can_read = client.get(f"/organizations/{org['id']}/projects", headers=auth_header(viewer_token["access_token"]))
    assert viewer_can_read.status_code == 200
    viewer_cannot_create = client.post(
        f"/organizations/{org['id']}/projects",
        headers=auth_header(viewer_token["access_token"]),
        json={"name": "Viewer Project"},
    )
    assert viewer_cannot_create.status_code == 403


def test_project_bill_invoice_profitability_reporting_and_reversals(client, db):
    tok, org, owner_user, accounts = bootstrap_projects(client, db, "projects-owner2@example.com")
    customer = client.post(f"/organizations/{org['id']}/customers", headers=auth_header(tok["access_token"]), json={"display_name": "Big Customer"}).json()
    supplier = client.post(f"/organizations/{org['id']}/suppliers", headers=auth_header(tok["access_token"]), json={"display_name": "Consulting Supplier"}).json()
    project = client.post(
        f"/organizations/{org['id']}/projects",
        headers=auth_header(tok["access_token"]),
        json={
            "code": "PRJ-200",
            "name": "ERP Rollout",
            "customer_id": customer["id"],
            "owner_user_id": str(owner_user.id),
            "status": "active",
            "budget_revenue": "12000.00",
            "budget_cost": "8000.00",
            "budget_hours": "100.00",
        },
    ).json()

    bill = client.post(
        f"/organizations/{org['id']}/bills",
        headers=auth_header(tok["access_token"]),
        json={
            "supplier_id": supplier["id"],
            "issue_date": "2026-01-05",
            "due_date": "2026-01-20",
            "currency_code": "USD",
            "items": [{"description": "Subcontractor design", "quantity": "1", "unit_price": "2500.00", "account_id": accounts["expense"]["id"], "project_id": project["id"]}],
        },
    )
    assert bill.status_code == 200
    bill_id = bill.json()["id"]
    assert client.post(f"/organizations/{org['id']}/bills/{bill_id}/approve", headers=auth_header(tok["access_token"])).status_code == 200
    assert client.post(f"/organizations/{org['id']}/bills/{bill_id}/post", headers=auth_header(tok["access_token"])).status_code == 200

    invoice = client.post(
        f"/organizations/{org['id']}/invoices",
        headers=auth_header(tok["access_token"]),
        json={
            "customer_id": customer["id"],
            "issue_date": "2026-01-06",
            "due_date": "2026-01-21",
            "currency_code": "USD",
            "items": [{"description": "Implementation services", "quantity": "1", "unit_price": "4000.00", "account_id": accounts["revenue"]["id"], "project_id": project["id"]}],
        },
    )
    assert invoice.status_code == 200
    invoice_id = invoice.json()["id"]
    assert client.post(f"/organizations/{org['id']}/invoices/{invoice_id}/approve", headers=auth_header(tok["access_token"])).status_code == 200
    assert client.post(f"/organizations/{org['id']}/invoices/{invoice_id}/send", headers=auth_header(tok["access_token"])).status_code == 200
    assert client.post(f"/organizations/{org['id']}/invoices/{invoice_id}/post", headers=auth_header(tok["access_token"])).status_code == 200

    time_entry = client.post(
        f"/organizations/{org['id']}/projects/{project['id']}/time-entries",
        headers=auth_header(tok["access_token"]),
        json={"user_id": str(owner_user.id), "entry_date": "2026-01-07", "hours": "10.0", "cost_rate": "50.00", "billing_rate": "100.00", "description": "Project management"},
    )
    assert time_entry.status_code == 200

    costs = client.get(f"/organizations/{org['id']}/projects/{project['id']}/costs", headers=auth_header(tok["access_token"])).json()["items"]
    revenue = client.get(f"/organizations/{org['id']}/projects/{project['id']}/revenue", headers=auth_header(tok["access_token"])).json()["items"]
    profitability = client.get(f"/organizations/{org['id']}/projects/{project['id']}/profitability", headers=auth_header(tok["access_token"])).json()
    activity = client.get(f"/organizations/{org['id']}/projects/{project['id']}/activity", headers=auth_header(tok["access_token"])).json()["items"]
    summary = client.get(f"/organizations/{org['id']}/project-summary", headers=auth_header(tok["access_token"])).json()["items"]

    assert len(costs) == 1
    assert len(revenue) == 1
    assert len(activity) >= 4
    assert len(summary) == 1
    assert Decimal(str(profitability["revenue_total"])) == Decimal("4000.00000000")
    assert Decimal(str(profitability["cost_total"])) == Decimal("3000.00000000")
    assert Decimal(str(profitability["time_cost_total"])) == Decimal("500.00000000")
    assert Decimal(str(profitability["gross_margin"])) == Decimal("1000.00000000")
    assert Decimal(str(profitability["actual_hours"])) == Decimal("10.00000000")

    assert db.query(ProjectCostEntry).filter(ProjectCostEntry.project_id == project["id"]).count() == 1
    assert db.query(ProjectRevenueEntry).filter(ProjectRevenueEntry.project_id == project["id"]).count() == 1

    voided_invoice = client.post(
        f"/organizations/{org['id']}/invoices/{invoice_id}/void",
        headers=auth_header(tok["access_token"]),
        json={"reason": "Customer cancellation"},
    )
    assert voided_invoice.status_code == 200

    profitability_after_void = client.get(
        f"/organizations/{org['id']}/projects/{project['id']}/profitability",
        headers=auth_header(tok["access_token"]),
    ).json()
    assert Decimal(str(profitability_after_void["revenue_total"])) == Decimal("0E-8")
    assert Decimal(str(profitability_after_void["gross_margin"])) == Decimal("-3000.00000000")
    assert db.query(ProjectRevenueEntry).filter(ProjectRevenueEntry.project_id == project["id"]).count() == 2


def test_project_customer_org_validation_on_documents(client, db):
    tok, org, owner_user, accounts = bootstrap_projects(client, db, "projects-owner3@example.com")
    customer = client.post(f"/organizations/{org['id']}/customers", headers=auth_header(tok["access_token"]), json={"display_name": "Scoped Customer"}).json()
    other_customer = client.post(f"/organizations/{org['id']}/customers", headers=auth_header(tok["access_token"]), json={"display_name": "Other Customer"}).json()
    supplier = client.post(f"/organizations/{org['id']}/suppliers", headers=auth_header(tok["access_token"]), json={"display_name": "Scoped Supplier"}).json()
    project = client.post(
        f"/organizations/{org['id']}/projects",
        headers=auth_header(tok["access_token"]),
        json={"code": "PRJ-300", "name": "Scoped Project", "customer_id": customer["id"], "owner_user_id": str(owner_user.id), "status": "active"},
    ).json()

    mismatched_invoice = client.post(
        f"/organizations/{org['id']}/invoices",
        headers=auth_header(tok["access_token"]),
        json={
            "customer_id": other_customer["id"],
            "issue_date": "2026-01-08",
            "due_date": "2026-01-21",
            "currency_code": "USD",
            "items": [{"description": "Mismatched project billing", "quantity": "1", "unit_price": "100.00", "account_id": accounts["revenue"]["id"], "project_id": project["id"]}],
        },
    )
    assert mismatched_invoice.status_code == 403

    other_tok, other_org, _, _ = bootstrap_projects(client, db, "projects-owner4@example.com")
    other_project = client.post(
        f"/organizations/{other_org['id']}/projects",
        headers=auth_header(other_tok["access_token"]),
        json={"code": "PRJ-999", "name": "External Project", "status": "active"},
    ).json()

    cross_org_bill = client.post(
        f"/organizations/{org['id']}/bills",
        headers=auth_header(tok["access_token"]),
        json={
            "supplier_id": supplier["id"],
            "issue_date": "2026-01-09",
            "due_date": "2026-01-22",
            "currency_code": "USD",
            "items": [{"description": "Cross-org cost", "quantity": "1", "unit_price": "100.00", "account_id": accounts["expense"]["id"], "project_id": other_project["id"]}],
        },
    )
    assert cross_org_bill.status_code == 404
