# StarAcc Backend Foundation

FastAPI + SQLAlchemy multi-tenant foundation for authentication, organizations, memberships, RBAC, session management, and audit logs.

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
  middleware
  utils
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

## Key endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/sessions`
- `DELETE /auth/sessions/{session_id}`
- `POST /organizations`
- `GET /organizations`
- `GET/PATCH/DELETE /organizations/{organization_id}`
- `GET/PATCH /organizations/{organization_id}/settings`
- `GET /organizations/{organization_id}/members`
- `POST /organizations/{organization_id}/invite`
- `POST /invitations/accept`
- `POST /invitations/decline`
- `GET /roles`
- `GET /permissions`
- `GET /organizations/{organization_id}/audit-logs`

## Example curl

```bash
curl -X POST http://localhost:8000/auth/register -H 'content-type: application/json' -d '{"email":"alice@example.com","password":"StrongPass123"}'

curl -X POST http://localhost:8000/auth/login -H 'content-type: application/json' -d '{"email":"alice@example.com","password":"StrongPass123"}'

curl -X POST http://localhost:8000/organizations -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json' -d '{"name":"Acme Ltd"}'
```

## Notes
- Password reset persistence and full MFA challenge flows are scaffolded with TODO placeholders.
- Invitation tokens are persisted with expiry.
- Organizations and users use soft-delete fields.
