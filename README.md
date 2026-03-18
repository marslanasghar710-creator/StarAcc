# StarAcc Backend Foundation + Accounting Core + AR + AP

FastAPI + SQLAlchemy multi-tenant backend with:
- Auth/session foundation
- Organization + RBAC
- Accounting core (chart of accounts, periods, journals, posting, balances, ledger/trial-balance)
- Accounts receivable foundation (customers, invoices, credit notes, customer payments, allocations, AR aging)
- Accounts payable foundation (suppliers, bills, supplier credits, supplier payments, allocations, AP aging)

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
