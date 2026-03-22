from decimal import Decimal

from app.db.models import JournalLine, User


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def bootstrap_payroll(client, db, email="payroll-owner@example.com"):
    client.post("/auth/register", json={"email": email, "password": "StrongPass123"})
    tok = client.post("/auth/login", json={"email": email, "password": "StrongPass123"}).json()
    org = client.post("/organizations", headers=auth_header(tok["access_token"]), json={"name": "Payroll Org"}).json()
    client.post(
        f"/organizations/{org['id']}/periods",
        headers=auth_header(tok["access_token"]),
        json={"name": "Jan 2026", "start_date": "2026-01-01", "end_date": "2026-01-31", "fiscal_year": 2026, "period_number": 1},
    )
    expense = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "6000", "name": "Payroll Expense", "account_type": "expense"}).json()
    hourly_expense = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "6001", "name": "Hourly Payroll Expense", "account_type": "expense"}).json()
    employer_tax_expense = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "6002", "name": "Employer Payroll Tax", "account_type": "expense"}).json()
    tax_liability = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "2200", "name": "Payroll Tax Liability", "account_type": "liability"}).json()
    pension_liability = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "2201", "name": "Pension Liability", "account_type": "liability"}).json()
    bank = client.post(f"/organizations/{org['id']}/accounts", headers=auth_header(tok["access_token"]), json={"code": "1005", "name": "Payroll Bank", "account_type": "asset"}).json()
    owner_user = db.query(User).filter(User.email == email).one()
    return tok, org, owner_user, {
        "expense": expense,
        "hourly_expense": hourly_expense,
        "employer_tax_expense": employer_tax_expense,
        "tax_liability": tax_liability,
        "pension_liability": pension_liability,
        "bank": bank,
    }


def create_payroll_types(client, token, org_id, accounts):
    salary = client.post(
        f"/organizations/{org_id}/payroll-earning-types",
        headers=auth_header(token),
        json={"code": "SALARY", "name": "Salary", "amount_type": "fixed", "expense_account_id": accounts["expense"]["id"]},
    ).json()
    bonus = client.post(
        f"/organizations/{org_id}/payroll-earning-types",
        headers=auth_header(token),
        json={"code": "BONUS", "name": "Bonus", "amount_type": "manual", "expense_account_id": accounts["expense"]["id"]},
    ).json()
    tax = client.post(
        f"/organizations/{org_id}/payroll-deduction-types",
        headers=auth_header(token),
        json={"code": "TAX", "name": "Tax", "liability_account_id": accounts["tax_liability"]["id"], "employer_expense_account_id": accounts["employer_tax_expense"]["id"]},
    ).json()
    pension = client.post(
        f"/organizations/{org_id}/payroll-deduction-types",
        headers=auth_header(token),
        json={"code": "PENSION", "name": "Pension", "liability_account_id": accounts["pension_liability"]["id"]},
    ).json()
    return {"salary": salary, "bonus": bonus, "tax": tax, "pension": pension}


def test_employee_permissions_and_uniqueness(client, db):
    tok, org, owner_user, accounts = bootstrap_payroll(client, db, "payroll-owner1@example.com")
    employee = client.post(
        f"/organizations/{org['id']}/employees",
        headers=auth_header(tok["access_token"]),
        json={
            "first_name": "Alice",
            "last_name": "Employee",
            "email": "alice@example.com",
            "employment_type": "salaried",
            "start_date": "2026-01-01",
            "default_salary_amount": "4000.00",
            "payroll_expense_account_id": accounts["expense"]["id"],
            "payroll_settings_json": {"department": "Operations"},
        },
    )
    assert employee.status_code == 200
    assert employee.json()["email"] == "alice@example.com"

    duplicate = client.post(
        f"/organizations/{org['id']}/employees",
        headers=auth_header(tok["access_token"]),
        json={
            "first_name": "Alicia",
            "last_name": "Duplicate",
            "email": "alice@example.com",
            "employment_type": "salaried",
            "start_date": "2026-01-01",
            "default_salary_amount": "2500.00",
            "payroll_expense_account_id": accounts["expense"]["id"],
        },
    )
    assert duplicate.status_code == 403

    role_list = client.get("/roles", headers=auth_header(tok["access_token"])).json()
    viewer_role = next(role for role in role_list if role["name"] == "viewer")
    invite = client.post(
        f"/organizations/{org['id']}/invite",
        headers=auth_header(tok["access_token"]),
        json={"email": "payroll-viewer@example.com", "role_id": viewer_role["id"]},
    )
    client.post("/auth/register", json={"email": "payroll-viewer@example.com", "password": "StrongPass123"})
    viewer_token = client.post("/auth/login", json={"email": "payroll-viewer@example.com", "password": "StrongPass123"}).json()
    client.post("/invitations/accept", headers=auth_header(viewer_token["access_token"]), json={"token": invite.json()["token"]})

    assert client.get(f"/organizations/{org['id']}/employees", headers=auth_header(viewer_token["access_token"])).status_code == 200
    assert client.post(
        f"/organizations/{org['id']}/employees",
        headers=auth_header(viewer_token["access_token"]),
        json={"first_name": "Blocked", "last_name": "User", "email": "blocked@example.com", "employment_type": "salaried", "start_date": "2026-01-01"},
    ).status_code == 403


def test_payroll_calculation_posting_and_reporting(client, db):
    tok, org, owner_user, accounts = bootstrap_payroll(client, db, "payroll-owner2@example.com")
    payroll_types = create_payroll_types(client, tok["access_token"], org["id"], accounts)

    salaried = client.post(
        f"/organizations/{org['id']}/employees",
        headers=auth_header(tok["access_token"]),
        json={"first_name": "Alice", "last_name": "Salary", "email": "salary@example.com", "employment_type": "salaried", "start_date": "2026-01-01", "default_salary_amount": "4000.00", "payroll_expense_account_id": accounts["expense"]["id"]},
    ).json()
    hourly = client.post(
        f"/organizations/{org['id']}/employees",
        headers=auth_header(tok["access_token"]),
        json={"first_name": "Bob", "last_name": "Hourly", "email": "hourly@example.com", "employment_type": "hourly", "start_date": "2026-01-01", "default_hourly_rate": "25.00", "payroll_expense_account_id": accounts["hourly_expense"]["id"]},
    ).json()

    payroll_period = client.post(
        f"/organizations/{org['id']}/payroll-periods",
        headers=auth_header(tok["access_token"]),
        json={"start_date": "2026-01-01", "end_date": "2026-01-31", "pay_date": "2026-01-31"},
    ).json()
    payroll_run = client.post(
        f"/organizations/{org['id']}/payroll-runs",
        headers=auth_header(tok["access_token"]),
        json={"payroll_period_id": payroll_period["id"], "funding_account_id": accounts["bank"]["id"], "default_expense_account_id": accounts["expense"]["id"], "reference": "PAY-2026-01"},
    ).json()

    calculated = client.post(
        f"/organizations/{org['id']}/payroll-runs/{payroll_run['id']}/calculate",
        headers=auth_header(tok["access_token"]),
        json={
            "employee_inputs": [
                {
                    "employee_id": salaried["id"],
                    "additional_earnings": [{"earning_type_id": payroll_types["bonus"]["id"], "amount": "500.00"}],
                    "deductions": [
                        {"deduction_type_id": payroll_types["tax"]["id"], "employee_amount": "600.00", "employer_amount": "150.00"},
                        {"deduction_type_id": payroll_types["pension"]["id"], "employee_amount": "100.00"},
                    ],
                },
                {
                    "employee_id": hourly["id"],
                    "hours_worked": "80.00",
                    "deductions": [{"deduction_type_id": payroll_types["tax"]["id"], "employee_amount": "250.00", "employer_amount": "80.00"}],
                },
            ]
        },
    )
    assert calculated.status_code == 200
    run_after_calculate = calculated.json()
    assert Decimal(str(run_after_calculate["total_gross"])) == Decimal("6500.00000000")
    assert Decimal(str(run_after_calculate["total_deductions"])) == Decimal("950.00000000")
    assert Decimal(str(run_after_calculate["total_employer_costs"])) == Decimal("230.00000000")
    assert Decimal(str(run_after_calculate["total_net"])) == Decimal("5550.00000000")
    assert run_after_calculate["entry_count"] == 2

    entries = client.get(f"/organizations/{org['id']}/payroll-runs/{payroll_run['id']}/entries", headers=auth_header(tok["access_token"])).json()["items"]
    assert len(entries) == 2
    entry_detail = client.get(f"/organizations/{org['id']}/payroll-entries/{entries[0]['id']}", headers=auth_header(tok["access_token"])).json()
    assert len(entry_detail["line_items"]) >= 3

    posted = client.post(f"/organizations/{org['id']}/payroll-runs/{payroll_run['id']}/post", headers=auth_header(tok["access_token"]))
    assert posted.status_code == 200
    posted_run = posted.json()
    assert posted_run["status"] == "posted"
    assert posted_run["posted_journal_id"] is not None

    journal_lines = db.query(JournalLine).filter(JournalLine.journal_entry_id == posted_run["posted_journal_id"]).all()
    assert len(journal_lines) == 6
    bank_credit = next(line for line in journal_lines if str(line.account_id) == accounts["bank"]["id"])
    assert Decimal(bank_credit.credit_amount) == Decimal("5550.00000000")

    summary = client.get(f"/organizations/{org['id']}/payroll-summary", headers=auth_header(tok["access_token"])).json()["items"]
    liabilities = client.get(f"/organizations/{org['id']}/payroll-liabilities", headers=auth_header(tok["access_token"])).json()["items"]
    assert len(summary) == 1
    assert Decimal(str(summary[0]["total_net"])) == Decimal("5550.00000000")
    tax_liability = next(item for item in liabilities if item["name"] == "Tax")
    assert Decimal(str(tax_liability["amount"])) == Decimal("1080.00000000")

    cannot_recalculate = client.post(
        f"/organizations/{org['id']}/payroll-runs/{payroll_run['id']}/calculate",
        headers=auth_header(tok["access_token"]),
        json={"employee_inputs": []},
    )
    assert cannot_recalculate.status_code == 403


def test_payroll_org_isolation_duplicate_run_and_inactive_employee_validation(client, db):
    tok, org, owner_user, accounts = bootstrap_payroll(client, db, "payroll-owner3@example.com")
    payroll_types = create_payroll_types(client, tok["access_token"], org["id"], accounts)
    inactive_employee = client.post(
        f"/organizations/{org['id']}/employees",
        headers=auth_header(tok["access_token"]),
        json={"first_name": "Inactive", "last_name": "Employee", "email": "inactive@example.com", "employment_type": "salaried", "start_date": "2026-01-01", "status": "inactive", "default_salary_amount": "3000.00", "payroll_expense_account_id": accounts["expense"]["id"]},
    ).json()
    payroll_period = client.post(
        f"/organizations/{org['id']}/payroll-periods",
        headers=auth_header(tok["access_token"]),
        json={"start_date": "2026-01-01", "end_date": "2026-01-31", "pay_date": "2026-01-31"},
    ).json()
    payroll_run = client.post(
        f"/organizations/{org['id']}/payroll-runs",
        headers=auth_header(tok["access_token"]),
        json={"payroll_period_id": payroll_period["id"], "funding_account_id": accounts["bank"]["id"], "default_expense_account_id": accounts["expense"]["id"]},
    ).json()
    duplicate_run = client.post(
        f"/organizations/{org['id']}/payroll-runs",
        headers=auth_header(tok["access_token"]),
        json={"payroll_period_id": payroll_period["id"], "funding_account_id": accounts["bank"]["id"]},
    )
    assert duplicate_run.status_code == 403

    inactive_calc = client.post(
        f"/organizations/{org['id']}/payroll-runs/{payroll_run['id']}/calculate",
        headers=auth_header(tok["access_token"]),
        json={"employee_inputs": [{"employee_id": inactive_employee["id"], "deductions": [{"deduction_type_id": payroll_types["tax"]["id"], "employee_amount": "10.00"}]}]},
    )
    assert inactive_calc.status_code == 403

    other_tok, other_org, _, other_accounts = bootstrap_payroll(client, db, "payroll-owner4@example.com")
    other_employee = client.post(
        f"/organizations/{other_org['id']}/employees",
        headers=auth_header(other_tok["access_token"]),
        json={"first_name": "Other", "last_name": "Org", "email": "other@example.com", "employment_type": "salaried", "start_date": "2026-01-01", "default_salary_amount": "2000.00", "payroll_expense_account_id": other_accounts["expense"]["id"]},
    ).json()

    cross_org_calc = client.post(
        f"/organizations/{org['id']}/payroll-runs/{payroll_run['id']}/calculate",
        headers=auth_header(tok["access_token"]),
        json={"employee_inputs": [{"employee_id": other_employee["id"], "deductions": [{"deduction_type_id": payroll_types["tax"]["id"], "employee_amount": "10.00"}]}]},
    )
    assert cross_org_calc.status_code == 403
