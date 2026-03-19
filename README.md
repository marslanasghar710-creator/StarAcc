# StarAcc Backend Foundation + Accounting Core + AR + AP + Banking

FastAPI + SQLAlchemy multi-tenant backend with:
- Auth/session foundation
- Organization + RBAC
- Accounting core (chart of accounts, periods, journals, posting, balances, ledger/trial-balance)
- Accounts receivable foundation (customers, invoices, credit notes, customer payments, allocations, AR aging)
- Accounts payable foundation (suppliers, bills, supplier credits, supplier payments, allocations, AP aging)
- Banking + reconciliation foundation (bank accounts, imported bank transactions, cash position, journal reconciliation)

## Setup

```bash
cp .env.example .env
docker compose up -d db
pip install -e .
alembic upgrade head
python scripts/seed_rbac.py
uvicorn app.main:app --reload
```

## AP endpoints

- `POST /organizations/{organization_id}/suppliers`
- `GET /organizations/{organization_id}/suppliers`
- `GET /organizations/{organization_id}/suppliers/search`
- `GET /organizations/{organization_id}/suppliers/{supplier_id}`
- `PATCH /organizations/{organization_id}/suppliers/{supplier_id}`
- `DELETE /organizations/{organization_id}/suppliers/{supplier_id}`
- `GET /organizations/{organization_id}/suppliers/{supplier_id}/activity`
- `GET /organizations/{organization_id}/suppliers/{supplier_id}/balance`
- `POST /organizations/{organization_id}/bills`
- `GET /organizations/{organization_id}/bills`
- `GET /organizations/{organization_id}/bills/search`
- `GET /organizations/{organization_id}/bills/open`
- `GET /organizations/{organization_id}/bills/overdue`
- `POST /organizations/{organization_id}/bills/{bill_id}/approve`
- `POST /organizations/{organization_id}/bills/{bill_id}/post`
- `POST /organizations/{organization_id}/bills/{bill_id}/void`
- `POST /organizations/{organization_id}/supplier-credits`
- `POST /organizations/{organization_id}/supplier-credits/{supplier_credit_id}/approve`
- `POST /organizations/{organization_id}/supplier-credits/{supplier_credit_id}/post`
- `POST /organizations/{organization_id}/supplier-credits/{supplier_credit_id}/apply`
- `POST /organizations/{organization_id}/supplier-payments`
- `POST /organizations/{organization_id}/supplier-payments/{payment_id}/post`
- `POST /organizations/{organization_id}/supplier-payments/{payment_id}/allocate`
- `GET /organizations/{organization_id}/accounts-payable/open-items`
- `GET /organizations/{organization_id}/accounts-payable/aging`
- `GET /organizations/{organization_id}/accounts-payable/supplier-summary`

## Example curl

```bash
curl -X POST http://localhost:8000/organizations/$ORG_ID/suppliers \
  -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"display_name":"Vendor Ltd","email":"payables@vendor.com"}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/bills \
  -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"supplier_id":"'$SUPPLIER_ID'","issue_date":"2026-01-10","due_date":"2026-01-20","currency_code":"USD","items":[{"description":"Office supplies","quantity":"1","unit_price":"300","account_id":"'$EXPENSE_ACCOUNT_ID'"}]}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/bills/$BILL_ID/post \
  -H "Authorization: Bearer $ACCESS"
```


## Banking endpoints

- `POST /organizations/{organization_id}/bank-accounts`
- `GET /organizations/{organization_id}/bank-accounts`
- `GET /organizations/{organization_id}/bank-accounts/{bank_account_id}`
- `PATCH /organizations/{organization_id}/bank-accounts/{bank_account_id}`
- `POST /organizations/{organization_id}/bank-transactions`
- `GET /organizations/{organization_id}/bank-transactions`
- `GET /organizations/{organization_id}/bank-transactions/unreconciled`
- `GET /organizations/{organization_id}/bank-transactions/{transaction_id}`
- `PATCH /organizations/{organization_id}/bank-transactions/{transaction_id}`
- `POST /organizations/{organization_id}/bank-transactions/{transaction_id}/reconcile-journal`
- `GET /organizations/{organization_id}/banking/cash-position`


## Reporting core

Reporting is ledger-first and organization-scoped:
- Financial statements (Profit & Loss, Balance Sheet, Trial Balance, General Ledger, Account Statement) read only posted journal effects from the GL.
- AR/AP aging reports read posted open-item state from the receivables/payables subledgers.
- Every report run/export writes audit metadata (`report.generated`, `report.exported`) and persists lightweight `report_runs` / `report_exports` history rows.
- Current-year earnings are presented as a computed Balance Sheet equity line until formal closing journals are introduced.
- Export support is implemented for CSV and JSON. PDF is intentionally scaffolded and returns a not-yet-implemented error.

### Reporting endpoints

- `GET /organizations/{organization_id}/reports/profit-loss`
- `GET /organizations/{organization_id}/reports/profit-loss/export`
- `GET /organizations/{organization_id}/reports/balance-sheet`
- `GET /organizations/{organization_id}/reports/balance-sheet/export`
- `GET /organizations/{organization_id}/reports/trial-balance`
- `GET /organizations/{organization_id}/reports/trial-balance/export`
- `GET /organizations/{organization_id}/reports/general-ledger`
- `GET /organizations/{organization_id}/reports/general-ledger/export`
- `GET /organizations/{organization_id}/reports/accounts/{account_id}/statement`
- `GET /organizations/{organization_id}/reports/accounts/{account_id}/statement/export`
- `GET /organizations/{organization_id}/reports/aged-receivables`
- `GET /organizations/{organization_id}/reports/aged-receivables/export`
- `GET /organizations/{organization_id}/reports/aged-payables`
- `GET /organizations/{organization_id}/reports/aged-payables/export`
- `GET /organizations/{organization_id}/report-runs`
- `GET /organizations/{organization_id}/report-runs/{report_run_id}`
- `GET /organizations/{organization_id}/report-exports`
- `GET /organizations/{organization_id}/report-exports/{export_id}`

### Reporting curl examples

```bash
curl -G http://localhost:8000/organizations/$ORG_ID/reports/profit-loss   -H "Authorization: Bearer $ACCESS"   --data-urlencode from_date=2026-01-01   --data-urlencode to_date=2026-01-31   --data-urlencode compare_from_date=2025-01-01   --data-urlencode compare_to_date=2025-01-31

curl -G http://localhost:8000/organizations/$ORG_ID/reports/balance-sheet/export   -H "Authorization: Bearer $ACCESS"   --data-urlencode as_of_date=2026-01-31   --data-urlencode export_format=csv   -o balance-sheet.csv

curl -G http://localhost:8000/organizations/$ORG_ID/reports/general-ledger   -H "Authorization: Bearer $ACCESS"   --data-urlencode from_date=2026-01-01   --data-urlencode to_date=2026-01-31   --data-urlencode account_id=$ACCOUNT_ID

curl -G http://localhost:8000/organizations/$ORG_ID/reports/accounts/$ACCOUNT_ID/statement/export   -H "Authorization: Bearer $ACCESS"   --data-urlencode from_date=2026-01-01   --data-urlencode to_date=2026-01-31   --data-urlencode export_format=json   -o account-statement.json

curl -G http://localhost:8000/organizations/$ORG_ID/reports/aged-receivables   -H "Authorization: Bearer $ACCESS"   --data-urlencode as_of_date=2026-03-31   --data-urlencode detailed=true

curl -G http://localhost:8000/organizations/$ORG_ID/reports/aged-payables/export   -H "Authorization: Bearer $ACCESS"   --data-urlencode as_of_date=2026-03-31   --data-urlencode detailed=true   --data-urlencode export_format=csv   -o aged-payables.csv
```
