from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from app.core.enums import AccountType, BankTransactionStatus, BankTransactionType, NormalBalance
from app.db.models.accounting import Account
from app.db.models.ar import Customer
from app.db.models.audit import AuditLog
from app.db.models.banking import BankAccount, BankTransaction
from app.db.models.organization import Organization, OrganizationSettings
from app.db.models.user import User
from app.services.activation_service import ActivationService
from app.tests.test_auth_org import auth_header, register_and_login
from app.core.security import hash_password

UTC = timezone.utc


def _create_user(db, email: str) -> User:
    user = User(email=email, password_hash=hash_password("StrongPass123"))
    db.add(user)
    db.flush()
    return user


def _create_account(db, org_id, code: str, account_type: AccountType) -> Account:
    normal = NormalBalance.DEBIT if account_type in {AccountType.ASSET, AccountType.EXPENSE} else NormalBalance.CREDIT
    account = Account(
        organization_id=org_id,
        code=code,
        name=f"{account_type.value.title()} {code}",
        account_type=account_type,
        normal_balance=normal,
        is_active=True,
        is_postable=True,
        is_system=False,
    )
    db.add(account)
    db.flush()
    return account


def _create_foundation(db, name: str = "Activation Org"):
    org = Organization(name=name, base_currency="USD", timezone="UTC", fiscal_year_start_month=1, fiscal_year_start_day=1)
    db.add(org)
    db.flush()
    db.add(OrganizationSettings(organization_id=org.id))
    db.add(AuditLog(
        organization_id=org.id,
        actor_user_id=None,
        action="activation.settings_reviewed",
        entity_type="activation",
        entity_id=str(org.id),
        metadata_json={"checklist_version": "v1"},
        created_at=datetime.now(UTC),
    ))
    for idx, account_type in enumerate((AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY, AccountType.REVENUE, AccountType.EXPENSE), start=1):
        _create_account(db, org.id, f"{idx}00", account_type)
    db.flush()
    return org


def test_activation_completion_requires_foundation_plus_operational_plus_workflow(db):
    owner = _create_user(db, "activation-rules@example.com")
    org = _create_foundation(db)
    asset_account = db.query(Account).filter(Account.organization_id == org.id, Account.account_type == AccountType.ASSET).first()
    db.add(BankAccount(organization_id=org.id, account_id=asset_account.id, name="Primary Bank", currency_code="USD", opening_balance=Decimal("0")))
    db.add(Customer(organization_id=org.id, display_name="Acme Customer", is_active=True))
    db.commit()

    service = ActivationService(db)
    before_workflow = service.evaluate_snapshot(str(org.id), user_id=str(owner.id))
    assert before_workflow.status == "in_progress"

    bank_account = db.query(BankAccount).filter(BankAccount.organization_id == org.id).first()
    db.add(BankTransaction(
        organization_id=org.id,
        bank_account_id=bank_account.id,
        transaction_date=date.today(),
        transaction_type=BankTransactionType.CREDIT,
        amount=Decimal("150.00"),
        description="Seed deposit",
        status=BankTransactionStatus.UNRECONCILED,
        created_by_user_id=owner.id,
    ))
    db.commit()

    completed = service.evaluate_snapshot(str(org.id), user_id=str(owner.id))
    assert completed.status == "completed"
    assert completed.milestones.initial_setup_complete is True
    assert completed.milestones.first_operational_record_created is True
    assert completed.milestones.first_transaction_workflow_started is True


def test_demo_org_activity_does_not_bleed_into_real_org_activation(db):
    owner = _create_user(db, "demo-isolation@example.com")
    real_org = _create_foundation(db, "Real Org")
    demo_org = _create_foundation(db, "Demo Org")
    demo_org.is_demo = True
    db.add(Customer(organization_id=demo_org.id, display_name="Demo Customer", is_active=True))
    db.commit()

    service = ActivationService(db)
    demo_snapshot = service.evaluate_snapshot(str(demo_org.id), user_id=str(owner.id))
    real_snapshot = service.evaluate_snapshot(str(real_org.id), user_id=str(owner.id))

    demo_customer = next(item for item in demo_snapshot.items if item.item_id == "customer_added")
    real_customer = next(item for item in real_snapshot.items if item.item_id == "customer_added")
    assert demo_customer.status == "complete"
    assert real_customer.status != "complete"


def test_activation_snapshot_contains_canonical_item_ids(client):
    tokens = register_and_login(client, "activation-items@example.com")
    org = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Activation Canonical Org"}).json()
    response = client.get(f"/organizations/{org['id']}/activation/snapshot", headers=auth_header(tokens["access_token"]))
    assert response.status_code == 200
    item_ids = {item["item_id"] for item in response.json()["snapshot"]["items"]}
    assert item_ids == {
        "org_created",
        "settings_reviewed",
        "chart_of_accounts_ready",
        "bank_account_added",
        "customer_added",
        "supplier_added",
        "first_invoice_created",
        "first_bill_created",
        "bank_import_started",
        "first_reconciliation_started",
        "teammate_invited",
    }
