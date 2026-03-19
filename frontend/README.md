# StarAcc Frontend Foundation

Production-ready frontend scaffolding for the StarAcc accounting platform.

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

## Project structure

```text
frontend/
  src/
    app/
      (auth)/
      (app)/
    components/
      ui/
      layout/
      navigation/
      auth/
      feedback/
      shared/
      forms/
    features/
      api/
      auth/
      organizations/
      notifications/
      permissions/
    lib/
      api/
      auth/
      env/
      formatters/
      guards/
      permissions/
    hooks/
    providers/
    types/
```

## Notes

- `src/components/ui` is prepared so future shadcn/ui components can be added without clashing with existing aliases or styling tokens.
- The authenticated shell is intentionally placeholder-only: real business workflows will be added in later frontend prompts.
- The API client already centralizes base URL handling, JSON requests, auth token injection scaffolding, and normalized errors.
- Auth state, organization switching, and permission resolution are scaffolded but intentionally not fully implemented yet.
