from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Permission, Role, RolePermission

BASE_PERMISSIONS = [
    "org.read",
    "org.update",
    "org.delete",
    "users.invite",
    "users.remove",
    "users.read",
    "roles.read",
    "settings.read",
    "settings.update",
]

ACCOUNTING_PERMISSIONS = [
    "accounts.create",
    "accounts.read",
    "accounts.update",
    "accounts.archive",
    "journals.create",
    "journals.read",
    "journals.update",
    "journals.post",
    "journals.reverse",
    "journals.void",
    "periods.create",
    "periods.read",
    "periods.update",
    "periods.close",
    "periods.lock",
    "periods.reopen",
    "ledger.read",
    "trial_balance.read",
]


AR_PERMISSIONS = [
    "customers.create",
    "customers.read",
    "customers.update",
    "customers.archive",
    "invoices.create",
    "invoices.read",
    "invoices.update",
    "invoices.approve",
    "invoices.send",
    "invoices.post",
    "invoices.void",
    "credit_notes.create",
    "credit_notes.read",
    "credit_notes.update",
    "credit_notes.post",
    "credit_notes.apply",
    "customer_payments.create",
    "customer_payments.read",
    "customer_payments.post",
    "customer_payments.allocate",
    "ar.read",
    "ar_aging.read",
]


AP_PERMISSIONS = [
    "suppliers.create",
    "suppliers.read",
    "suppliers.update",
    "suppliers.archive",
    "bills.create",
    "bills.read",
    "bills.update",
    "bills.approve",
    "bills.post",
    "bills.void",
    "supplier_credits.create",
    "supplier_credits.read",
    "supplier_credits.update",
    "supplier_credits.post",
    "supplier_credits.apply",
    "supplier_payments.create",
    "supplier_payments.read",
    "supplier_payments.post",
    "supplier_payments.allocate",
    "ap.read",
    "ap_aging.read",
]


BANKING_PERMISSIONS = [
    "bank_accounts.create",
    "bank_accounts.read",
    "bank_accounts.update",
    "bank_transactions.create",
    "bank_transactions.read",
    "bank_transactions.update",
    "bank_reconciliation.read",
    "bank_reconciliation.reconcile",
]
PERMISSIONS = BASE_PERMISSIONS + ACCOUNTING_PERMISSIONS + AR_PERMISSIONS + AP_PERMISSIONS + BANKING_PERMISSIONS

ROLE_DEFAULTS = {
    "owner": PERMISSIONS,
    "admin": [p for p in PERMISSIONS if p != "periods.reopen"],
    "accountant": [p for p in PERMISSIONS if p not in {"org.delete", "periods.reopen"}],
    "staff": ["org.read", "customers.read", "invoices.create", "invoices.read", "invoices.update", "invoices.send", "suppliers.read", "bills.create", "bills.read", "bills.update", "accounts.read", "journals.read", "ledger.read", "bank_accounts.read", "bank_transactions.create", "bank_transactions.read", "bank_reconciliation.read"],
    "viewer": ["org.read", "customers.read", "invoices.read", "credit_notes.read", "customer_payments.read", "suppliers.read", "bills.read", "supplier_credits.read", "supplier_payments.read", "ar.read", "ar_aging.read", "ap.read", "ap_aging.read", "accounts.read", "journals.read", "ledger.read", "trial_balance.read", "bank_accounts.read", "bank_transactions.read", "bank_reconciliation.read"],
}


def main():
    engine = create_engine(settings.database_url)
    with Session(engine) as db:
        permission_map = {}
        for code in PERMISSIONS:
            permission = db.scalar(select(Permission).where(Permission.code == code))
            if not permission:
                permission = Permission(code=code, description=code)
                db.add(permission)
                db.flush()
            permission_map[code] = permission

        for role_name, perm_codes in ROLE_DEFAULTS.items():
            role = db.scalar(select(Role).where(Role.name == role_name))
            if not role:
                role = Role(name=role_name, description=role_name)
                db.add(role)
                db.flush()
            for code in perm_codes:
                exists = db.scalar(
                    select(RolePermission).where(RolePermission.role_id == role.id, RolePermission.permission_id == permission_map[code].id)
                )
                if not exists:
                    db.add(RolePermission(role_id=role.id, permission_id=permission_map[code].id))

        db.commit()


if __name__ == "__main__":
    main()
