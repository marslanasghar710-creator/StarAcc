# StarAcc Backend Foundation + Accounting Core + Accounts Receivable

FastAPI + SQLAlchemy multi-tenant backend with:
- Auth/session foundation
- Organization + RBAC
- Accounting core (chart of accounts, periods, journals, posting, balances, ledger/trial-balance)
- Accounts receivable foundation (customers, invoices, credit notes, customer payments, allocations, AR aging)

## Project tree

```text
app/
  api/deps
  api/routers
  core
  db/models
  repositories
  schemas
  services
  tests
alembic/
scripts/
```

## Setup

```bash
cp .env.example .env
docker compose up -d db
pip install -e .
alembic upgrade head
python scripts/seed_rbac.py
uvicorn app.main:app --reload
```

## AR endpoints

- `POST /organizations/{organization_id}/customers`
- `GET /organizations/{organization_id}/customers`
- `GET /organizations/{organization_id}/customers/search`
- `GET /organizations/{organization_id}/customers/{customer_id}`
- `PATCH /organizations/{organization_id}/customers/{customer_id}`
- `DELETE /organizations/{organization_id}/customers/{customer_id}`
- `GET /organizations/{organization_id}/customers/{customer_id}/activity`
- `GET /organizations/{organization_id}/customers/{customer_id}/balance`
- `POST /organizations/{organization_id}/invoices`
- `GET /organizations/{organization_id}/invoices`
- `GET /organizations/{organization_id}/invoices/search`
- `GET /organizations/{organization_id}/invoices/open`
- `GET /organizations/{organization_id}/invoices/overdue`
- `POST /organizations/{organization_id}/invoices/{invoice_id}/approve`
- `POST /organizations/{organization_id}/invoices/{invoice_id}/send`
- `POST /organizations/{organization_id}/invoices/{invoice_id}/post`
- `POST /organizations/{organization_id}/invoices/{invoice_id}/void`
- `POST /organizations/{organization_id}/credit-notes`
- `POST /organizations/{organization_id}/credit-notes/{credit_note_id}/approve`
- `POST /organizations/{organization_id}/credit-notes/{credit_note_id}/post`
- `POST /organizations/{organization_id}/credit-notes/{credit_note_id}/apply`
- `POST /organizations/{organization_id}/customer-payments`
- `POST /organizations/{organization_id}/customer-payments/{payment_id}/post`
- `POST /organizations/{organization_id}/customer-payments/{payment_id}/allocate`
- `GET /organizations/{organization_id}/accounts-receivable/open-items`
- `GET /organizations/{organization_id}/accounts-receivable/aging`
- `GET /organizations/{organization_id}/accounts-receivable/customer-summary`

## Example curl

```bash
curl -X POST http://localhost:8000/auth/register -H 'content-type: application/json' -d '{"email":"alice@example.com","password":"StrongPass123"}'

curl -X POST http://localhost:8000/auth/login -H 'content-type: application/json' -d '{"email":"alice@example.com","password":"StrongPass123"}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/customers \
  -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"display_name":"Acme Ltd","email":"billing@acme.com"}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/invoices \
  -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"customer_id":"'$CUSTOMER_ID'","issue_date":"2026-01-10","due_date":"2026-01-20","currency_code":"USD","items":[{"description":"Consulting","quantity":"1","unit_price":"1000","account_id":"'$REV_ACCOUNT_ID'"}]}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/invoices/$INVOICE_ID/post \
  -H "Authorization: Bearer $ACCESS"
```
