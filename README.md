# StarAcc Backend Foundation + Accounting Core

FastAPI + SQLAlchemy multi-tenant backend with:
- Auth/session foundation
- Organization + RBAC
- Accounting core (chart of accounts, periods, journals, posting, balances, ledger/trial-balance)

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

## Accounting endpoints

- `POST /organizations/{organization_id}/accounts`
- `GET /organizations/{organization_id}/accounts`
- `GET /organizations/{organization_id}/accounts/search`
- `GET /organizations/{organization_id}/accounts/{account_id}`
- `PATCH /organizations/{organization_id}/accounts/{account_id}`
- `DELETE /organizations/{organization_id}/accounts/{account_id}`
- `GET /organizations/{organization_id}/accounts/{account_id}/balance`
- `GET /organizations/{organization_id}/accounts/{account_id}/ledger`
- `POST /organizations/{organization_id}/journals`
- `GET /organizations/{organization_id}/journals`
- `GET /organizations/{organization_id}/journals/search`
- `GET /organizations/{organization_id}/journals/{journal_id}`
- `PATCH /organizations/{organization_id}/journals/{journal_id}`
- `DELETE /organizations/{organization_id}/journals/{journal_id}`
- `POST /organizations/{organization_id}/journals/{journal_id}/post`
- `POST /organizations/{organization_id}/journals/{journal_id}/reverse`
- `POST /organizations/{organization_id}/journals/{journal_id}/void`
- `POST /organizations/{organization_id}/periods`
- `GET /organizations/{organization_id}/periods`
- `PATCH /organizations/{organization_id}/periods/{period_id}`
- `POST /organizations/{organization_id}/periods/{period_id}/close|lock|reopen`
- `GET /organizations/{organization_id}/ledger`
- `GET /organizations/{organization_id}/trial-balance`

## Example curl

```bash
curl -X POST http://localhost:8000/auth/register -H 'content-type: application/json' -d '{"email":"alice@example.com","password":"StrongPass123"}'

curl -X POST http://localhost:8000/auth/login -H 'content-type: application/json' -d '{"email":"alice@example.com","password":"StrongPass123"}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/periods \
  -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"name":"Jan 2026","start_date":"2026-01-01","end_date":"2026-01-31","fiscal_year":2026,"period_number":1}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/accounts \
  -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"code":"1000","name":"Cash","account_type":"asset"}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/journals \
  -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"entry_date":"2026-01-10","description":"Initial capital","lines":[{"account_id":"'$CASH'","debit_amount":"1000","credit_amount":"0","currency_code":"USD"},{"account_id":"'$EQUITY'","debit_amount":"0","credit_amount":"1000","currency_code":"USD"}]}'
```
