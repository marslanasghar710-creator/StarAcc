# F19 Demo / Seed Data Infrastructure

## Goals
- Provision isolated demo organizations without mixing with real books.
- Support deterministic, scenario-driven demo bootstraps for dev/staging.
- Provide a backend API and CLI for listing and provisioning demo scenarios.

## Scenario keys
- `demo_company_us` (default SME trading company)
- `demo_company_uk` (services-heavy profile)
- `group_consolidation_demo` (parent + subsidiaries consolidation demo)

## Entrypoints
- CLI:
  - `python scripts/seed_demo_data.py --list`
  - `python scripts/seed_demo_data.py --scenario demo_company_us`
  - `python scripts/seed_demo_data.py --scenario all --reset` (non-prod only)
- API:
  - `GET /organizations/demo/scenarios`
  - `POST /organizations/demo/provision`

## Isolation rules
- Demo organizations are marked with:
  - `is_demo`
  - `demo_scenario_key`
  - `seed_version`
  - `seeded_at`
  - `seeded_by_system`
  - `resettable_in_non_prod`
  - `demo_expires_at`
- Demo metadata is informational; accounting permissions and posting rules are unchanged.

## Seed behavior
- Seeds are deterministic via seeded RNG and stable suffixing.
- Scenario re-runs are idempotent by scenario key unless `--reset` is used.
- Reset is environment-guarded and blocked in production.

## Coverage seeded
- Organization + memberships (owner/admin/accountant/viewer)
- Financial periods
- Chart of accounts
- Customers and suppliers
- Invoices, bills, payments, and journals
- Bank accounts and bank transactions
- Inventory items and opening adjustments
- Projects and project profitability entries
- Payroll employees, periods, and posted runs
- AI suggestions and audit seed-complete marker
- Consolidation group/run for group scenario
