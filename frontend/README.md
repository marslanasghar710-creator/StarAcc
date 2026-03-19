# StarAcc Frontend Foundation

Production-grade frontend foundation for the StarAcc accounting platform.

## Scope in this milestone

This frontend layer intentionally focuses on platform foundations only:

- authenticated app shell
- login/register UI
- session restore and logout
- active organization switching
- permission-aware navigation and rendering
- notifications inbox and unread count wiring
- dashboard shell with real backend integration where practical
- placeholder protected routes for later accounting modules

Detailed accounting workflows are **not** implemented here yet.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- shadcn/ui-style component setup
- TanStack Query
- React Hook Form
- Zod
- lucide-react
- next-themes
- sonner

## Getting started

> Preferred package manager: `pnpm`

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

## Environment variables

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
```

## Backend assumptions and adapters

This frontend uses the backend contracts already present in the repository and adds a small adapter layer where payloads are more primitive than the UI needs.

### Auth

Used endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/sessions`
- `DELETE /auth/sessions/{session_id}`

### Organizations

Used endpoints:

- `GET /organizations`
- `GET /organizations/{organization_id}`
- `GET /organizations/{organization_id}/settings`
- `GET /organizations/{organization_id}/members`

### Notifications

Used endpoints:

- `GET /organizations/{organization_id}/notifications`
- `GET /organizations/{organization_id}/notifications/unread-count`
- `POST /organizations/{organization_id}/notifications/{notification_id}/read`
- `POST /organizations/{organization_id}/notifications/read-all`

### Permissions adapter

`GET /auth/me` currently returns organization memberships with `role` as a role UUID, not a flattened permission list.

To keep the UI permission-aware without hardcoding permissions inside pages:

1. the frontend also calls `GET /roles`
2. it maps role IDs to role names
3. it normalizes permissions from the seeded role defaults in `scripts/seed_rbac.py`

This is a deliberate adapter layer until the backend exposes effective permissions directly.

## Session storage strategy

This implementation uses a thin client-side session abstraction:

- access token stored in local storage or session storage based on "remember me"
- refresh token stored alongside it using the same persistence choice
- API client attaches bearer tokens centrally
- on `401`, the client attempts a single refresh and retries the request

This keeps token handling out of page components and is designed to be replaceable later if the backend moves fully to secure cookie-based refresh sessions.

## Permission UX approach

Navigation is **hidden** when the current role lacks the required permission for a module.

Route/page access still fails safely:

- protected routes require authentication
- page-level components render access-denied UI when the user lacks the required permission
- backend authorization remains the source of truth

## Project structure

```text
frontend/
  src/
    app/
      (auth)/
      (app)/
    components/
      auth/
      feedback/
      layout/
      navigation/
      notifications/
      organizations/
      permissions/
      shared/
      ui/
    features/
      auth/
      notifications/
      organizations/
      permissions/
    lib/
      api/
      auth/
      permissions/
      env/
      formatters/
    providers/
    hooks/
    types/
```

## Notes

- The dashboard intentionally avoids fake accounting metrics and instead surfaces backend-driven organization and notification context.
- The placeholder module pages exist so later prompts can replace content incrementally without rebuilding shell, auth, or permission infrastructure.
- The UI is organization-aware first: switching organizations invalidates scoped queries so later feature modules can layer on that behavior consistently.
