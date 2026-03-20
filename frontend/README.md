# StarAcc Frontend Foundation

Production-grade frontend foundation for the StarAcc accounting platform.

## Scope in this milestone

This frontend layer now includes the first real accounting workflows for:

- authenticated app shell
- login/register UI
- session restore and logout
- active organization switching
- permission-aware navigation and rendering
- notifications inbox and unread count wiring
- chart of accounts list/detail/create/edit/archive flows
- manual journal list/detail/create/edit workflows
- journal posting and reversal actions
- financial period visibility in journal workflows

Detailed banking, reporting, and tax workflows remain out of scope for this milestone.

Suppliers and bills are now live with backend-backed list/detail/create/edit, approval/posting state actions, payment status visibility, and attachment scaffolding.

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
- Vitest + Testing Library for focused UI/unit tests

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
pnpm test
```

## Accounting routes added

- `/accounts`
- `/accounts/[accountId]`
- `/journals`
- `/journals/new`
- `/journals/[journalId]`
- `/suppliers`
- `/suppliers/[supplierId]`
- `/bills`
- `/bills/new`
- `/bills/[billId]`

## Backend assumptions and adapters

This frontend uses the backend contracts already present in the repository and adds adapter logic where payloads are narrower or use snake_case naming.

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

### Accounts

Used endpoints:

- `GET /organizations/{organization_id}/accounts`
- `GET /organizations/{organization_id}/accounts/search`
- `GET /organizations/{organization_id}/accounts/{account_id}`
- `POST /organizations/{organization_id}/accounts`
- `PATCH /organizations/{organization_id}/accounts/{account_id}`
- `DELETE /organizations/{organization_id}/accounts/{account_id}`
- `GET /organizations/{organization_id}/accounts/{account_id}/balance`
- `GET /organizations/{organization_id}/accounts/{account_id}/ledger`

### Journals

Used endpoints:

- `GET /organizations/{organization_id}/journals`
- `GET /organizations/{organization_id}/journals/search`
- `GET /organizations/{organization_id}/journals/{journal_id}`
- `POST /organizations/{organization_id}/journals`
- `PATCH /organizations/{organization_id}/journals/{journal_id}`
- `POST /organizations/{organization_id}/journals/{journal_id}/post`
- `POST /organizations/{organization_id}/journals/{journal_id}/reverse`
- `POST /organizations/{organization_id}/journals/{journal_id}/void`


### Suppliers

Used endpoints:

- `POST /organizations/{organization_id}/suppliers`
- `GET /organizations/{organization_id}/suppliers`
- `GET /organizations/{organization_id}/suppliers/search`
- `GET /organizations/{organization_id}/suppliers/{supplier_id}`
- `PATCH /organizations/{organization_id}/suppliers/{supplier_id}`
- `DELETE /organizations/{organization_id}/suppliers/{supplier_id}`
- `GET /organizations/{organization_id}/suppliers/{supplier_id}/activity`
- `GET /organizations/{organization_id}/suppliers/{supplier_id}/balance`

### Bills

Used endpoints:

- `POST /organizations/{organization_id}/bills`
- `GET /organizations/{organization_id}/bills`
- `GET /organizations/{organization_id}/bills/search`
- `GET /organizations/{organization_id}/bills/open`
- `GET /organizations/{organization_id}/bills/overdue`
- `GET /organizations/{organization_id}/bills/{bill_id}`
- `PATCH /organizations/{organization_id}/bills/{bill_id}`
- `DELETE /organizations/{organization_id}/bills/{bill_id}`
- `POST /organizations/{organization_id}/bills/{bill_id}/approve`
- `POST /organizations/{organization_id}/bills/{bill_id}/post`
- `POST /organizations/{organization_id}/bills/{bill_id}/void`
- `GET /organizations/{organization_id}/documents/entity/bill/{bill_id}`
- `GET /organizations/{organization_id}/files`
- `POST /organizations/{organization_id}/documents/links`

### AP adapter notes

- Supplier detail adapters accept richer fields such as website, tax number, billing address, remittance address, and timestamps if the backend returns them, while still remaining compatible with the narrower schema currently documented in the repository.
- Bill detail adapters accept richer fields such as `supplier_name`, `supplier_invoice_number`, `items`, `approved_at`, and `posted_at` when present. When those fields are missing, the UI keeps rendering with graceful fallbacks rather than inventing accounting state on the client.
- Bill forms only save drafts. Approval, posting, voiding, payment visibility, and attachments all reflect backend state; the frontend does not calculate authoritative totals or posting outcomes.

### Periods

Used endpoints:

- `GET /organizations/{organization_id}/periods`
- `GET /organizations/{organization_id}/periods/{period_id}`

### Journal detail adapter note

The backend router/schema in this repository currently documents `JournalResponse` as a summary object and does not formally include `lines`, `reference`, or some audit metadata fields even though the underlying model contains them.

The frontend therefore:

1. accepts richer detail responses if they are present
2. renders journal lines automatically when `lines` are returned
3. shows a clear “line detail unavailable” state when the current backend response is summary-only
4. avoids unsafe draft editing when line data is unavailable

This keeps the backend as source of truth while remaining compatible with evolving API detail shapes.

## Permission UX approach

Navigation is hidden when the current role lacks the required permission for a module.

Route/page access still fails safely:

- protected routes require authentication
- page-level components render access-denied UI when the user lacks the required permission
- action buttons only appear when the current role allows the action
- backend authorization remains the source of truth

## Project structure

```text
frontend/
  src/
    app/
      (auth)/
      (app)/
        accounts/
        journals/
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
      accounts/
      auth/
      journals/
      notifications/
      organizations/
      periods/
      permissions/
    lib/
      accounting/
      api/
      auth/
      permissions/
      env/
      formatters/
    providers/
    test/
    types/
```

## Notes

- Draft totals and balance indicators are advisory only; backend validation remains authoritative.
- Period state is visible throughout journal workflows, but period mutation UI is intentionally out of scope.
- Archive, post, reverse, and void actions all refetch backend state after successful mutations.
- This implementation favors dense, audit-friendly tables and metadata layouts over marketing-style presentation.
