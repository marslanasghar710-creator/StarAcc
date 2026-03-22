from decimal import Decimal

from app.db.models import AccountingSettings, JournalLine


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def bootstrap_inventory(client, db, email="inventory-owner@example.com"):
    client.post("/auth/register", json={"email": email, "password": "StrongPass123"})
    tok = client.post("/auth/login", json={"email": email, "password": "StrongPass123"}).json()
    org = client.post("/organizations", headers=auth_header(tok["access_token"]), json={"name": "Inventory Org"}).json()
    client.post(
        f"/organizations/{org['id']}/periods",
        headers=auth_header(tok["access_token"]),
        json={"name": "Jan 2026", "start_date": "2026-01-01", "end_date": "2026-01-31", "fiscal_year": 2026, "period_number": 1},
    )
    ar = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "1100", "name": "Accounts Receivable", "account_type": "asset"}).json()
    ap = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "2100", "name": "Accounts Payable", "account_type": "liability"}).json()
    inventory_asset = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "1200", "name": "Inventory Asset", "account_type": "asset"}).json()
    revenue = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "4000", "name": "Sales", "account_type": "revenue"}).json()
    expense = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "5000", "name": "COGS", "account_type": "expense"}).json()
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
    return tok, org, {"ar": ar, "ap": ap, "inventory_asset": inventory_asset, "revenue": revenue, "expense": expense, "cash": cash}


def create_tracked_item(client, token, org_id, accounts, sku="WIDGET-1"):
    response = client.post(
        f"/organizations/{org_id}/items",
        headers=auth_header(token),
        json={
            "sku": sku,
            "name": "Tracked Widget",
            "is_sellable": True,
            "is_purchasable": True,
            "is_tracked_inventory": True,
            "income_account_id": accounts["revenue"]["id"],
            "expense_account_id": accounts["expense"]["id"],
            "inventory_asset_account_id": accounts["inventory_asset"]["id"],
            "sales_price": "9.00",
            "purchase_price": "5.00",
        },
    )
    assert response.status_code == 200
    return response.json()


def test_item_validation_and_permissions(client, db):
    tok, org, accounts = bootstrap_inventory(client, db, "inventory-owner1@example.com")
    invalid = client.post(
        f"/organizations/{org['id']}/items",
        headers=auth_header(tok["access_token"]),
        json={
            "sku": "BROKEN-1",
            "name": "Broken tracked item",
            "is_sellable": True,
            "is_purchasable": True,
            "is_tracked_inventory": True,
            "income_account_id": accounts["revenue"]["id"],
            "expense_account_id": accounts["expense"]["id"],
        },
    )
    assert invalid.status_code == 403

    item = create_tracked_item(client, tok["access_token"], org["id"], accounts, sku="TRACK-1")
    assert item["sku"] == "TRACK-1"

    role_list = client.get("/roles", headers=auth_header(tok["access_token"])).json()
    viewer_role = next(role for role in role_list if role["name"] == "viewer")
    invite = client.post(
        f"/organizations/{org['id']}/invite",
        headers=auth_header(tok["access_token"]),
        json={"email": "inventory-viewer@example.com", "role_id": viewer_role["id"]},
    )
    assert invite.status_code == 200
    client.post("/auth/register", json={"email": "inventory-viewer@example.com", "password": "StrongPass123"})
    viewer_token = client.post("/auth/login", json={"email": "inventory-viewer@example.com", "password": "StrongPass123"}).json()
    accepted = client.post("/invitations/accept", headers=auth_header(viewer_token["access_token"]), json={"token": invite.json()["token"]})
    assert accepted.status_code == 200

    can_read = client.get(f"/organizations/{org['id']}/items", headers=auth_header(viewer_token["access_token"]))
    assert can_read.status_code == 200
    cannot_create = client.post(
        f"/organizations/{org['id']}/items",
        headers=auth_header(viewer_token["access_token"]),
        json={"name": "Viewer item", "is_sellable": True, "income_account_id": accounts["revenue"]["id"]},
    )
    assert cannot_create.status_code == 403


def test_bill_invoice_inventory_movements_and_valuation(client, db):
    tok, org, accounts = bootstrap_inventory(client, db, "inventory-owner2@example.com")
    item = create_tracked_item(client, tok["access_token"], org["id"], accounts, sku="TRACK-2")
    location = client.post(
        f"/organizations/{org['id']}/inventory/locations",
        headers=auth_header(tok["access_token"]),
        json={"code": "MAIN", "name": "Main warehouse"},
    ).json()
    supplier = client.post(f"/organizations/{org['id']}/suppliers", headers=auth_header(tok["access_token"]), json={"display_name": "Widgets Supplier"}).json()
    customer = client.post(f"/organizations/{org['id']}/customers", headers=auth_header(tok["access_token"]), json={"display_name": "Retail Customer"}).json()

    bill = client.post(
        f"/organizations/{org['id']}/bills",
        headers=auth_header(tok["access_token"]),
        json={
            "supplier_id": supplier["id"],
            "issue_date": "2026-01-05",
            "due_date": "2026-01-20",
            "currency_code": "USD",
            "items": [{"item_id": item["id"], "location_id": location["id"], "description": "Widget purchase", "quantity": "10", "unit_price": "5.00"}],
        },
    )
    assert bill.status_code == 200
    bill_id = bill.json()["id"]
    assert client.post(f"/organizations/{org['id']}/bills/{bill_id}/approve", headers=auth_header(tok["access_token"])).status_code == 200
    posted_bill = client.post(f"/organizations/{org['id']}/bills/{bill_id}/post", headers=auth_header(tok["access_token"]))
    assert posted_bill.status_code == 200

    balance_after_bill = client.get(
        f"/organizations/{org['id']}/inventory/items/{item['id']}/balance",
        headers=auth_header(tok["access_token"]),
        params={"location_id": location["id"]},
    )
    assert balance_after_bill.status_code == 200
    bill_balance = balance_after_bill.json()
    assert Decimal(str(bill_balance["quantity_on_hand"])) == Decimal("10")
    assert Decimal(str(bill_balance["average_unit_cost"])) == Decimal("5.00000000")
    assert Decimal(str(bill_balance["inventory_value"])) == Decimal("50.00000000")

    invoice = client.post(
        f"/organizations/{org['id']}/invoices",
        headers=auth_header(tok["access_token"]),
        json={
            "customer_id": customer["id"],
            "issue_date": "2026-01-10",
            "due_date": "2026-01-20",
            "currency_code": "USD",
            "items": [{"item_id": item["id"], "location_id": location["id"], "description": "Widget sale", "quantity": "4", "unit_price": "9.00"}],
        },
    )
    assert invoice.status_code == 200
    invoice_id = invoice.json()["id"]
    assert client.post(f"/organizations/{org['id']}/invoices/{invoice_id}/approve", headers=auth_header(tok["access_token"])).status_code == 200
    assert client.post(f"/organizations/{org['id']}/invoices/{invoice_id}/send", headers=auth_header(tok["access_token"])).status_code == 200
    posted_invoice = client.post(f"/organizations/{org['id']}/invoices/{invoice_id}/post", headers=auth_header(tok["access_token"]))
    assert posted_invoice.status_code == 200

    balance_after_invoice = client.get(
        f"/organizations/{org['id']}/inventory/items/{item['id']}/balance",
        headers=auth_header(tok["access_token"]),
        params={"location_id": location["id"]},
    ).json()
    assert Decimal(str(balance_after_invoice["quantity_on_hand"])) == Decimal("6")
    assert Decimal(str(balance_after_invoice["inventory_value"])) == Decimal("30.00000000")

    movements = client.get(f"/organizations/{org['id']}/inventory/items/{item['id']}/movements", headers=auth_header(tok["access_token"])).json()
    assert len(movements["items"]) == 2
    valuation = client.get(f"/organizations/{org['id']}/inventory/valuation", headers=auth_header(tok["access_token"])).json()
    assert Decimal(str(valuation["total_inventory_value"])) == Decimal("30.00000000")

    cogs_lines = db.query(JournalLine).filter(JournalLine.journal_entry_id == posted_invoice.json()["posted_journal_id"], JournalLine.account_id == accounts["expense"]["id"]).all()
    assert len(cogs_lines) == 1
    assert Decimal(cogs_lines[0].debit_amount) == Decimal("20.00000000")


def test_adjustments_negative_inventory_and_closed_period_rules(client, db):
    tok, org, accounts = bootstrap_inventory(client, db, "inventory-owner3@example.com")
    item = create_tracked_item(client, tok["access_token"], org["id"], accounts, sku="TRACK-3")

    bad_negative = client.post(
        f"/organizations/{org['id']}/inventory/adjustments",
        headers=auth_header(tok["access_token"]),
        json={
            "item_id": item["id"],
            "adjustment_type": "quantity_write_down",
            "quantity": "-1",
            "reason": "Shrinkage",
            "offset_account_id": accounts["expense"]["id"],
            "occurred_at": "2026-01-08T00:00:00Z",
        },
    )
    assert bad_negative.status_code == 403

    opening = client.post(
        f"/organizations/{org['id']}/inventory/adjustments",
        headers=auth_header(tok["access_token"]),
        json={
            "item_id": item["id"],
            "adjustment_type": "opening_stock",
            "quantity": "3",
            "unit_cost": "2.50",
            "reason": "Opening stock",
            "offset_account_id": accounts["expense"]["id"],
            "occurred_at": "2026-01-09T00:00:00Z",
        },
    )
    assert opening.status_code == 200

    period_list = client.get(f"/organizations/{org['id']}/periods", headers=auth_header(tok["access_token"])).json()["items"]
    jan_period = period_list[0]
    assert client.post(f"/organizations/{org['id']}/periods/{jan_period['id']}/close", headers=auth_header(tok["access_token"])).status_code == 200

    closed_period_adjustment = client.post(
        f"/organizations/{org['id']}/inventory/adjustments",
        headers=auth_header(tok["access_token"]),
        json={
            "item_id": item["id"],
            "adjustment_type": "quantity_write_up",
            "quantity": "1",
            "unit_cost": "2.50",
            "reason": "Late count",
            "offset_account_id": accounts["expense"]["id"],
            "occurred_at": "2026-01-10T00:00:00Z",
        },
    )
    assert closed_period_adjustment.status_code == 403


def test_voiding_posted_bill_creates_inventory_reversal(client, db):
    tok, org, accounts = bootstrap_inventory(client, db, "inventory-owner4@example.com")
    item = create_tracked_item(client, tok["access_token"], org["id"], accounts, sku="TRACK-4")
    supplier = client.post(f"/organizations/{org['id']}/suppliers", headers=auth_header(tok["access_token"]), json={"display_name": "Reversible Supplier"}).json()

    bill = client.post(
        f"/organizations/{org['id']}/bills",
        headers=auth_header(tok["access_token"]),
        json={
            "supplier_id": supplier["id"],
            "issue_date": "2026-01-12",
            "due_date": "2026-01-20",
            "currency_code": "USD",
            "items": [{"item_id": item["id"], "description": "Reverse me", "quantity": "2", "unit_price": "7.00"}],
        },
    )
    bill_id = bill.json()["id"]
    client.post(f"/organizations/{org['id']}/bills/{bill_id}/approve", headers=auth_header(tok["access_token"]))
    client.post(f"/organizations/{org['id']}/bills/{bill_id}/post", headers=auth_header(tok["access_token"]))

    voided = client.post(f"/organizations/{org['id']}/bills/{bill_id}/void", headers=auth_header(tok["access_token"]), json={"reason": "Void"})
    assert voided.status_code == 200

    movements = client.get(f"/organizations/{org['id']}/inventory/items/{item['id']}/movements", headers=auth_header(tok["access_token"])).json()["items"]
    assert len(movements) == 2
    assert Decimal(str(movements[0]["quantity"])) == Decimal("2.00000000")
    assert Decimal(str(movements[1]["quantity"])) == Decimal("-2.00000000")
    balance = client.get(f"/organizations/{org['id']}/inventory/items/{item['id']}/balance", headers=auth_header(tok["access_token"])).json()
    assert Decimal(str(balance["quantity_on_hand"])) == Decimal("0")
