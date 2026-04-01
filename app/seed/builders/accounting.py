from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace

from sqlalchemy import select

from app.core.enums import AccountType, BankTransactionType
from app.db.models import Customer, Supplier
from app.repositories.account_repository import AccountRepository
from app.repositories.ai_repository import AIRepository
from app.repositories.audit import AuditRepository
from app.repositories.bank_transaction_repository import BankTransactionRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.supplier_repository import SupplierRepository
from app.seed.contracts import SeedContext, SeedSummary
from app.services.account_service import AccountService
from app.services.bank_account_service import BankAccountService
from app.services.bank_transaction_service import BankTransactionService
from app.services.bill_service import BillService
from app.services.customer_payment_service import CustomerPaymentService
from app.services.inventory_service import InventoryService
from app.services.invoice_service import InvoiceService
from app.services.journal_service import JournalService
from app.services.payroll_service import PayrollService
from app.services.project_service import ProjectService
from app.services.supplier_payment_service import SupplierPaymentService


@dataclass(slots=True)
class SeededAccounts:
    cash_main: object
    cash_ops: object
    ar: object
    ap: object
    sales: object
    cogs: object
    rent: object
    payroll: object
    inventory_asset: object
    tax_liability: object
    tax_input: object
    wages_payable: object
    equity: object


def ensure_periods(context: SeedContext, organization_id) -> None:
    from app.repositories.period_repository import PeriodRepository

    periods = PeriodRepository(context.db).list(organization_id)
    if periods:
        return

    repo = PeriodRepository(context.db)
    start = date(context.now.year - 1, context.now.month, 1)
    for i in range(0, 13):
        month_start = (start.replace(day=1) + timedelta(days=i * 32)).replace(day=1)
        next_month = (month_start + timedelta(days=32)).replace(day=1)
        month_end = next_month - timedelta(days=1)
        repo.create(
            organization_id=organization_id,
            name=month_start.strftime("%b %Y"),
            start_date=month_start,
            end_date=month_end,
            fiscal_year=month_start.year,
            period_number=month_start.month,
            status="open",
        )
    context.db.flush()


def ensure_chart_of_accounts(context: SeedContext, organization_id, actor_user_id) -> SeededAccounts:
    account_service = AccountService(context.db)
    repo = AccountRepository(context.db)
    defs = [
        ("1000", "Main Checking", AccountType.ASSET),
        ("1010", "Operations Savings", AccountType.ASSET),
        ("1100", "Accounts Receivable", AccountType.ASSET),
        ("1200", "Inventory Asset", AccountType.ASSET),
        ("2000", "Accounts Payable", AccountType.LIABILITY),
        ("2100", "Sales Tax Payable", AccountType.LIABILITY),
        ("2110", "Input Tax Control", AccountType.ASSET),
        ("2200", "Payroll Liabilities", AccountType.LIABILITY),
        ("3000", "Owner Equity", AccountType.EQUITY),
        ("4000", "Product Sales", AccountType.REVENUE),
        ("5000", "Cost of Goods Sold", AccountType.EXPENSE),
        ("6100", "Rent Expense", AccountType.EXPENSE),
        ("6200", "Payroll Expense", AccountType.EXPENSE),
    ]
    code_to_id: dict[str, object] = {}
    for code, name, account_type in defs:
        account = repo.get_by_code(organization_id, code)
        if not account:
            account = account_service.create(
                organization_id,
                actor_user_id,
                {
                    "code": code,
                    "name": name,
                    "account_type": account_type.value,
                    "normal_balance": "debit" if account_type in {AccountType.ASSET, AccountType.EXPENSE} else "credit",
                    "is_postable": True,
                    "is_active": True,
                    "is_system": False,
                },
            )
        code_to_id[code] = account.id

    return SeededAccounts(
        cash_main=code_to_id["1000"],
        cash_ops=code_to_id["1010"],
        ar=code_to_id["1100"],
        inventory_asset=code_to_id["1200"],
        ap=code_to_id["2000"],
        tax_liability=code_to_id["2100"],
        tax_input=code_to_id["2110"],
        wages_payable=code_to_id["2200"],
        equity=code_to_id["3000"],
        sales=code_to_id["4000"],
        cogs=code_to_id["5000"],
        rent=code_to_id["6100"],
        payroll=code_to_id["6200"],
    )


def seed_parties(context: SeedContext, organization_id: str, summary: SeedSummary) -> tuple[list[Customer], list[Supplier]]:
    customers = CustomerRepository(context.db)
    suppliers = SupplierRepository(context.db)

    customer_rows = customers.list(organization_id)
    if not customer_rows:
        industries = ["Retail", "SaaS", "Wholesale", "Consulting", "Hospitality"]
        for index in range(1, 21):
            customer_rows.append(
                customers.create(
                    organization_id=organization_id,
                    display_name=f"{industries[index % len(industries)]} Customer {index:02d}",
                    email=f"customer{index:02d}@example.test",
                    phone=f"+1-555-01{index:02d}",
                    billing_address_line1=f"{100 + index} Market Street",
                    billing_city="Austin",
                    billing_state="TX",
                    billing_postal_code=f"733{index:02d}",
                    billing_country="US",
                    payment_terms_days=30 if index % 3 else 45,
                    is_active=True,
                )
            )
        summary.bump("customers", len(customer_rows))

    supplier_rows = suppliers.list(organization_id)
    if not supplier_rows:
        names = ["Metro Utilities", "Cloudstack Software", "Northwind Logistics", "Vertex Contractors", "Skyline Office Supply", "Prime Packaging", "Riverfront Rentals", "Payroll Services Co", "Digital Ads Hub", "Harbor Telecom"]
        for index, name in enumerate(names, start=1):
            supplier_rows.append(
                suppliers.create(
                    organization_id=organization_id,
                    display_name=name,
                    email=f"ap{index:02d}@vendor.test",
                    phone=f"+1-555-02{index:02d}",
                    billing_address_line1=f"{200 + index} Supplier Avenue",
                    billing_city="Austin",
                    billing_state="TX",
                    billing_postal_code=f"787{index:02d}",
                    billing_country="US",
                    payment_terms_days=30,
                    is_active=True,
                )
            )
        summary.bump("suppliers", len(supplier_rows))

    return customer_rows, supplier_rows


def seed_transactions(
    context: SeedContext,
    organization_id: str,
    actor_user_id: str,
    accounts: SeededAccounts,
    customers: list[Customer],
    suppliers: list[Supplier],
    summary: SeedSummary,
) -> None:
    ensure_periods(context, organization_id)

    journal_service = JournalService(context.db)
    invoice_service = InvoiceService(context.db)
    bill_service = BillService(context.db)
    customer_payment_service = CustomerPaymentService(context.db)
    supplier_payment_service = SupplierPaymentService(context.db)
    bank_account_service = BankAccountService(context.db)
    bank_txn_service = BankTransactionService(context.db)
    project_service = ProjectService(context.db)
    inventory_service = InventoryService(context.db)
    payroll_service = PayrollService(context.db)

    # Opening balance journal
    opening_date = date(context.now.year - 1, context.now.month, 1)
    journal_service.create_and_post(
        organization_id,
        actor_user_id,
        {
            "entry_date": opening_date,
            "description": "Opening balances for demo scenario",
            "reference": "DEMO-OPENING",
            "source_module": "seed",
            "source_type": "opening_balance",
            "source_id": context.scenario_key,
            "lines": [
                SimpleNamespace(account_id=accounts.cash_main, description="Opening cash", debit_amount=Decimal("150000"), credit_amount=Decimal("0"), currency_code="USD", exchange_rate=None),
                SimpleNamespace(account_id=accounts.inventory_asset, description="Opening inventory", debit_amount=Decimal("42000"), credit_amount=Decimal("0"), currency_code="USD", exchange_rate=None),
                SimpleNamespace(account_id=accounts.equity, description="Opening equity", debit_amount=Decimal("0"), credit_amount=Decimal("192000"), currency_code="USD", exchange_rate=None),
            ],
        },
    )
    summary.bump("journals_posted")

    # Bank accounts
    from app.repositories.bank_account_repository import BankAccountRepository

    bank_repo = BankAccountRepository(context.db)
    bank_main = bank_repo.get_by_account(organization_id, accounts.cash_main)
    if not bank_main:
        bank_main = bank_account_service.create(
            organization_id,
            actor_user_id,
            {
                "account_id": accounts.cash_main,
                "name": "Main Operating Account",
                "bank_name": "First National",
                "account_number_masked": "****4582",
                "currency_code": "USD",
                "opening_balance": Decimal("150000"),
                "is_active": True,
            },
        )
    bank_ops = bank_repo.get_by_account(organization_id, accounts.cash_ops)
    if not bank_ops:
        bank_ops = bank_account_service.create(
            organization_id,
            actor_user_id,
            {
                "account_id": accounts.cash_ops,
                "name": "Savings Reserve",
                "bank_name": "First National",
                "account_number_masked": "****9301",
                "currency_code": "USD",
                "opening_balance": Decimal("25000"),
                "is_active": True,
            },
        )
    summary.bump("bank_accounts", 2)

    # Inventory seed
    locations = inventory_service.list_locations(organization_id)
    if not locations:
        location = inventory_service.create_location(organization_id, actor_user_id, {"code": "MAIN", "name": "Main warehouse", "is_active": True})
    else:
        location = locations[0]

    items = inventory_service.list_items(organization_id)
    if not items:
        for idx in range(1, 13):
            item = inventory_service.create_item(
                organization_id,
                actor_user_id,
                {
                    "sku": f"SKU-{idx:03d}",
                    "name": f"Demo Item {idx:02d}",
                    "description": "Seeded inventory item",
                    "is_active": True,
                    "is_sellable": True,
                    "is_purchasable": True,
                    "is_tracked_inventory": True,
                    "unit_of_measure": "each",
                    "sales_price": Decimal("35") + Decimal(idx),
                    "purchase_price": Decimal("18") + Decimal(idx) / Decimal("2"),
                    "income_account_id": accounts.sales,
                    "expense_account_id": accounts.cogs,
                    "inventory_asset_account_id": accounts.inventory_asset,
                },
            )
            inventory_service.create_adjustment(
                organization_id,
                actor_user_id,
                {
                    "item_id": item.id,
                    "location_id": location.id,
                    "adjustment_type": "opening_stock",
                    "quantity": Decimal("50") + idx,
                    "unit_cost": Decimal("15") + Decimal(idx) / Decimal("3"),
                    "offset_account_id": accounts.equity,
                    "reason": "Seed opening stock",
                    "notes": "F19 demo seed",
                    "occurred_at": datetime.combine(opening_date + timedelta(days=5), datetime.min.time()),
                },
            )
        summary.bump("inventory_items", 12)

    # Projects
    projects = project_service.list_projects(organization_id)
    if not projects:
        project_customers = customers[:6]
        for idx, customer in enumerate(project_customers, start=1):
            project = project_service.create_project(
                organization_id,
                actor_user_id,
                {
                    "code": f"PRJ-{idx:03d}",
                    "name": f"Implementation {idx:02d}",
                    "description": "Seeded project for profitability views",
                    "customer_id": customer.id,
                    "status": "active",
                    "start_date": opening_date + timedelta(days=idx * 10),
                    "budget_revenue": Decimal("25000") + idx * 1800,
                    "budget_cost": Decimal("14000") + idx * 1200,
                    "budget_hours": Decimal("240"),
                    "currency_code": "USD",
                },
            )
            project_service.record_cost_entry(
                organization_id,
                actor_user_id,
                project_id=project.id,
                source_entity_type="manual",
                source_entity_id=f"seed-cost-{idx}",
                transaction_date=context.now.date() - timedelta(days=idx * 7),
                description="Contractor cost",
                amount=Decimal("1800") + idx * 90,
                currency_code="USD",
                account_id=accounts.rent,
            )
            project_service.record_revenue_entry(
                organization_id,
                actor_user_id,
                project_id=project.id,
                source_entity_type="manual",
                source_entity_id=f"seed-revenue-{idx}",
                transaction_date=context.now.date() - timedelta(days=idx * 6),
                description="Milestone billing",
                amount=Decimal("3200") + idx * 140,
                currency_code="USD",
                account_id=accounts.sales,
                customer_id=customer.id,
            )
        summary.bump("projects", 6)

    # Invoices and bills
    invoices = []
    for idx in range(1, 25):
        customer = customers[idx % len(customers)]
        issue = context.now.date() - timedelta(days=idx * 9)
        invoice = invoice_service.create(
            organization_id,
            actor_user_id,
            {
                "customer_id": customer.id,
                "issue_date": issue,
                "due_date": issue + timedelta(days=30),
                "currency_code": "USD",
                "reference": f"SO-{idx:04d}",
                "notes": "Seeded demo invoice",
                "items": [{"description": "Consulting services", "quantity": Decimal("1"), "unit_price": Decimal("1200") + idx * 25, "account_id": accounts.sales}],
            },
        )
        if idx > 2:
            invoice_service.approve(organization_id, invoice.id, actor_user_id)
        if idx > 4:
            invoice_service.send(organization_id, invoice.id, actor_user_id)
        if idx > 6:
            invoice_service.post(organization_id, invoice.id, actor_user_id)
        invoices.append(invoice)
    summary.bump("invoices", len(invoices))

    bills = []
    for idx in range(1, 18):
        supplier = suppliers[idx % len(suppliers)]
        issue = context.now.date() - timedelta(days=idx * 11)
        bill = bill_service.create(
            organization_id,
            actor_user_id,
            {
                "supplier_id": supplier.id,
                "issue_date": issue,
                "due_date": issue + timedelta(days=21),
                "currency_code": "USD",
                "reference": f"PO-{idx:04d}",
                "notes": "Seeded demo bill",
                "items": [{"description": "Operating expense", "quantity": Decimal("1"), "unit_price": Decimal("680") + idx * 19, "account_id": accounts.rent}],
            },
        )
        if idx > 1:
            bill_service.approve(organization_id, bill.id, actor_user_id)
        if idx > 3:
            bill_service.post(organization_id, bill.id, actor_user_id)
        bills.append(bill)
    summary.bump("bills", len(bills))

    # Payments + allocations for partial and fully paid states
    for invoice in invoices[8:18]:
        payment = customer_payment_service.create(
            organization_id,
            actor_user_id,
            {
                "customer_id": invoice.customer_id,
                "payment_date": invoice.issue_date + timedelta(days=18),
                "currency_code": invoice.currency_code,
                "amount": invoice.total_amount,
                "payment_method": "bank_transfer",
                "reference": f"RCPT-{invoice.invoice_number}",
                "deposit_account_id": accounts.cash_main,
            },
        )
        customer_payment_service.post(organization_id, payment.id, actor_user_id)
        customer_payment_service.allocate(organization_id, payment.id, invoice.id, invoice.total_amount, payment.payment_date, actor_user_id)
        summary.bump("customer_payments")

    for bill in bills[6:12]:
        amount = bill.total_amount if int(str(bill.id.int)[-1]) % 2 else (bill.total_amount / Decimal("2"))
        payment = supplier_payment_service.create(
            organization_id,
            actor_user_id,
            {
                "supplier_id": bill.supplier_id,
                "payment_date": bill.issue_date + timedelta(days=14),
                "currency_code": bill.currency_code,
                "amount": amount,
                "payment_method": "ach",
                "reference": f"PAY-{bill.bill_number}",
                "disbursement_account_id": accounts.cash_main,
            },
        )
        supplier_payment_service.post(organization_id, payment.id, actor_user_id)
        supplier_payment_service.allocate(organization_id, payment.id, bill.id, amount, payment.payment_date, actor_user_id)
        summary.bump("supplier_payments")

    # Bank transactions and suggestions
    txn_repo = BankTransactionRepository(context.db)
    if len(txn_repo.list(organization_id)) < 80:
        for idx in range(1, 101):
            direction = Decimal("1") if idx % 3 else Decimal("-1")
            amount = (Decimal("420") + Decimal(idx) * Decimal("13.7")) * direction
            tx = bank_txn_service.create(
                organization_id,
                actor_user_id,
                {
                    "bank_account_id": bank_main.id if idx % 4 else bank_ops.id,
                    "transaction_date": context.now.date() - timedelta(days=idx),
                    "posted_date": context.now.date() - timedelta(days=idx - 1),
                    "description": "Seed customer receipt" if direction > 0 else "Seed supplier payment",
                    "reference": f"BNK-{idx:04d}",
                    "amount": amount,
                    "transaction_type": BankTransactionType.DEPOSIT if direction > 0 else BankTransactionType.WITHDRAWAL,
                    "source_module": "seed",
                    "target_account_id": accounts.sales if direction > 0 else accounts.rent,
                },
            )
            if idx % 6 == 0:
                AIRepository(context.db).create_suggestion(
                    organization_id=organization_id,
                    target_entity_type="bank_transaction",
                    target_entity_id=str(tx.id),
                    suggestion_type="bank_transaction_categorization",
                    reason_summary="Recurring pattern suggests office expense category.",
                    suggested_payload_json={"target_account_id": accounts.rent},
                    explanation_json={"confidence": "high", "pattern": "monthly"},
                    source_type="rule",
                    confidence_score=Decimal("0.83"),
                )
                summary.bump("automation_suggestions")
        summary.bump("bank_transactions", 100)

    # Payroll: simple quarterly runs for realism
    if not payroll_service.list_employees(organization_id):
        for idx in range(1, 9):
            payroll_service.create_employee(
                organization_id,
                actor_user_id,
                {
                    "employee_number": f"EMP-{idx:03d}",
                    "first_name": f"Demo{idx}",
                    "last_name": "Employee",
                    "email": f"employee{idx:02d}@demo.staracc.local",
                    "status": "active",
                    "employment_type": "salaried",
                    "start_date": opening_date,
                    "salary_amount": Decimal("5200") + idx * 220,
                    "currency_code": "USD",
                    "payroll_expense_account_id": accounts.payroll,
                },
            )
        summary.bump("employees", 8)

    if not payroll_service.list_periods(organization_id):
        for q in range(0, 4):
            start = date(context.now.year, q * 3 + 1, 1)
            end = start + timedelta(days=89)
            payroll_service.create_period(
                organization_id,
                actor_user_id,
                {
                    "name": f"Q{q + 1} Payroll",
                    "start_date": start,
                    "end_date": end,
                    "pay_date": end,
                    "status": "draft",
                },
            )
        summary.bump("payroll_periods", 4)

    runs = payroll_service.list_runs(organization_id)
    if not runs:
        for period in payroll_service.list_periods(organization_id)[:2]:
            run = payroll_service.create_run(
                organization_id,
                actor_user_id,
                {
                    "name": f"{period.name} Run",
                    "payroll_period_id": period.id,
                    "funding_account_id": accounts.cash_main,
                    "default_expense_account_id": accounts.payroll,
                },
            )
            payroll_service.calculate_run(organization_id, run.id, actor_user_id, {"employee_inputs": []})
            payroll_service.post_run(organization_id, run.id, actor_user_id)
            summary.bump("payroll_runs")

    # Ensure audit feels alive via explicit milestone event.
    AuditRepository(context.db).create(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action="seed.completed",
        entity_type="organization",
        entity_id=str(organization_id),
        metadata_json={"scenario": context.scenario_key, "seed_version": context.seed_version},
    )
