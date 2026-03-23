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

## Audit / activity center

The backend now exposes a richer organization-scoped activity query surface on top of the append-only audit log table:
- `GET /organizations/{organization_id}/audit-logs` returns the legacy flat audit log list ordered newest-first.
- `GET /organizations/{organization_id}/activity-center` returns filtered audit rows plus summary metadata for centralized activity-center UIs.
- Supported `activity-center` filters include `q`, `action`, `entity_type`, `entity_id`, `actor_user_id`, `actor_email`, `created_from`, `created_to`, and `limit`.
- The response includes `total_count`, distinct actor/action/entity-type counts, `top_actions`, `top_entity_types`, `has_more`, and the applied limit so the frontend can stay read-only and backend-driven.

### Activity center curl example

```bash
curl -G http://localhost:8000/organizations/$ORG_ID/activity-center \
  -H "Authorization: Bearer $ACCESS" \
  --data-urlencode q=invoice \
  --data-urlencode entity_type=invoice \
  --data-urlencode actor_email=owner@example.com \
  --data-urlencode limit=50
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


## Advanced custom reporting

The advanced reporting extension adds a backend-governed custom report builder foundation:
- Organization-scoped saved report definitions live in `custom_report_definitions` and remain the system of record for datasets, columns, filters, grouping, sorting, and display options.
- Executions are tracked in `custom_report_executions`, so saved report runs and exports stay attributable to a user, definition, and dataset.
- Dataset metadata is explicit and permission-aware: the backend only exposes declared datasets, fields, filters, groupings, and aggregations, and it never accepts raw SQL or arbitrary query text from the client.
- Current built-in custom-report datasets cover accounts, journal lines, invoices, bills, bank transactions, inventory items, projects, and payroll entries.
- CSV export is implemented for preview and saved-report execution flows; PDF remains scaffolded through the existing export service and intentionally returns the backend's not-yet-implemented response where applicable.

### Custom reporting permissions

- `reports.custom.read`
- `reports.custom.create`
- `reports.custom.update`
- `reports.custom.delete`
- `reports.export`

### Custom reporting endpoints

#### Report definitions
- `POST /organizations/{organization_id}/custom-reports`
- `GET /organizations/{organization_id}/custom-reports`
- `GET /organizations/{organization_id}/custom-reports/{report_id}`
- `PATCH /organizations/{organization_id}/custom-reports/{report_id}`
- `DELETE /organizations/{organization_id}/custom-reports/{report_id}`

#### Dataset metadata
- `GET /organizations/{organization_id}/custom-reports/datasets`
- `GET /organizations/{organization_id}/custom-reports/datasets/{dataset_id}`
- `GET /organizations/{organization_id}/custom-reports/datasets/{dataset_id}/fields`
- `GET /organizations/{organization_id}/custom-reports/datasets/{dataset_id}/filters`
- `GET /organizations/{organization_id}/custom-reports/datasets/{dataset_id}/groupings`

#### Execution and exports
- `POST /organizations/{organization_id}/custom-reports/preview`
- `POST /organizations/{organization_id}/custom-reports/preview/export`
- `POST /organizations/{organization_id}/custom-reports/{report_id}/run`
- `GET /organizations/{organization_id}/custom-reports/{report_id}/results`
- `POST /organizations/{organization_id}/custom-reports/{report_id}/export`

### Custom reporting curl example

```bash
curl -X POST http://localhost:8000/organizations/$ORG_ID/custom-reports/preview \
  -H "Authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{
    "dataset_id": "journal_lines",
    "columns": ["source_module", "net_amount"],
    "filters": [{"field": "entry_date", "operator": "between", "value": "2026-01-01", "value_to": "2026-02-28"}],
    "groupings": ["source_module"],
    "sorting": [{"field": "source_module", "direction": "asc"}],
    "page": 1,
    "page_size": 50
  }'
```


## Tax engine foundation

The tax module adds reusable VAT/GST-style master data, calculation, posting, and reporting groundwork:
- Organization-scoped `tax_settings`, `tax_rates`, `tax_codes`, `tax_code_components`, and `tax_transactions`.
- Server-side tax calculation previews using deterministic Decimal math.
- AR/AP posting integrations that preserve tax snapshots on document lines and post tax control lines into the general ledger.
- Tax summary reporting from persisted `tax_transactions` with JSON/CSV export and PDF scaffold behavior.
- Banking cash-coding groundwork is limited to tax capture/snapshot fields on bank transactions; full cash-coding journal generation remains future work.

### Tax endpoints

- `GET /organizations/{organization_id}/tax/settings`
- `PATCH /organizations/{organization_id}/tax/settings`
- `POST /organizations/{organization_id}/tax/rates`
- `GET /organizations/{organization_id}/tax/rates`
- `GET /organizations/{organization_id}/tax/rates/{tax_rate_id}`
- `PATCH /organizations/{organization_id}/tax/rates/{tax_rate_id}`
- `DELETE /organizations/{organization_id}/tax/rates/{tax_rate_id}`
- `POST /organizations/{organization_id}/tax/codes`
- `GET /organizations/{organization_id}/tax/codes`
- `GET /organizations/{organization_id}/tax/codes/{tax_code_id}`
- `PATCH /organizations/{organization_id}/tax/codes/{tax_code_id}`
- `DELETE /organizations/{organization_id}/tax/codes/{tax_code_id}`
- `POST /organizations/{organization_id}/tax/calculate-preview`
- `GET /organizations/{organization_id}/tax/reports/summary`
- `GET /organizations/{organization_id}/tax/reports/summary/export`
- `GET /organizations/{organization_id}/tax/transactions`

### Tax curl examples

```bash
curl -X PATCH http://localhost:8000/organizations/$ORG_ID/tax/settings   -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json'   -d '{"tax_enabled":true,"prices_entered_are":"exclusive","default_output_tax_account_id":"'$OUTPUT_TAX_ACCOUNT_ID'","default_input_tax_account_id":"'$INPUT_TAX_ACCOUNT_ID'"}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/tax/rates   -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json'   -d '{"name":"Standard VAT","code":"VAT20","percentage":"20.00","tax_type":"standard","scope":"both","report_group":"vat_standard"}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/tax/codes   -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json'   -d '{"name":"VAT 20%","code":"VAT20","calculation_method":"percentage","applies_to":"both","components":[{"tax_rate_id":"'$TAX_RATE_ID'","sequence_number":1,"compound_on_previous":false}]}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/tax/calculate-preview   -H "Authorization: Bearer $ACCESS" -H 'content-type: application/json'   -d '{"lines":[{"description":"Subscription","quantity":"1","unit_price":"120.00","tax_code_id":"'$TAX_CODE_ID'","price_mode":"inclusive","usage":"sales"}]}'

curl -G http://localhost:8000/organizations/$ORG_ID/tax/reports/summary   -H "Authorization: Bearer $ACCESS"   --data-urlencode from_date=2026-01-01   --data-urlencode to_date=2026-03-31
```

## Settings, documents, and notifications foundation

This module adds the operational layer needed before frontend work begins:
- Organization-scoped preferences, branding, numbering, and notification settings.
- Stored file metadata plus local filesystem-backed binary storage abstraction.
- Generic document links so one file can be attached to multiple business entities without changing accounting meaning.
- Email templates, deterministic rendering, outbound email logs, and invoice send-email foundation.
- In-app notifications with unread tracking and read acknowledgements.

### Settings / document / notification endpoints

- `GET /organizations/{organization_id}/settings/preferences`
- `PATCH /organizations/{organization_id}/settings/preferences`
- `GET /organizations/{organization_id}/settings/branding`
- `PATCH /organizations/{organization_id}/settings/branding`
- `GET /organizations/{organization_id}/settings/numbering`
- `PATCH /organizations/{organization_id}/settings/numbering`
- `GET /organizations/{organization_id}/settings/notifications`
- `PATCH /organizations/{organization_id}/settings/notifications`
- `GET /organizations/{organization_id}/users/me/notification-preferences`
- `PATCH /organizations/{organization_id}/users/me/notification-preferences`
- `POST /organizations/{organization_id}/files/upload`
- `GET /organizations/{organization_id}/files`
- `GET /organizations/{organization_id}/files/{file_id}`
- `GET /organizations/{organization_id}/files/{file_id}/download`
- `DELETE /organizations/{organization_id}/files/{file_id}`
- `POST /organizations/{organization_id}/documents/links`
- `GET /organizations/{organization_id}/documents/links`
- `DELETE /organizations/{organization_id}/documents/links/{link_id}`
- `GET /organizations/{organization_id}/documents/entity/{entity_type}/{entity_id}`
- `POST /organizations/{organization_id}/email-templates`
- `GET /organizations/{organization_id}/email-templates`
- `GET /organizations/{organization_id}/email-templates/{template_id}`
- `PATCH /organizations/{organization_id}/email-templates/{template_id}`
- `DELETE /organizations/{organization_id}/email-templates/{template_id}`
- `POST /organizations/{organization_id}/emails/send`
- `GET /organizations/{organization_id}/emails`
- `GET /organizations/{organization_id}/emails/{email_log_id}`
- `POST /organizations/{organization_id}/invoices/{invoice_id}/send-email`
- `GET /organizations/{organization_id}/notifications`
- `GET /organizations/{organization_id}/notifications/unread-count`
- `POST /organizations/{organization_id}/notifications/{notification_id}/read`
- `POST /organizations/{organization_id}/notifications/read-all`

### Settings / document / notification curl examples

```bash
curl -X PATCH http://localhost:8000/organizations/$ORG_ID/settings/preferences \
  -H "Authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"default_locale":"en_GB","timezone":"America/New_York","date_format":"YYYY-MM-DD","number_format":"1,234.56","week_start_day":1}'

curl -X PATCH http://localhost:8000/organizations/$ORG_ID/settings/numbering \
  -H "Authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"invoice_prefix":"INV","next_invoice_number":1001,"bill_prefix":"BIL","next_bill_number":501}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/files/upload \
  -H "Authorization: Bearer $ACCESS" \
  -F upload=@./sample-invoice.pdf

curl -X POST http://localhost:8000/organizations/$ORG_ID/documents/links \
  -H "Authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"file_id":"'$FILE_ID'","entity_type":"invoice","entity_id":"'$INVOICE_ID'","label":"Vendor source document"}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/email-templates \
  -H "Authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"template_type":"invoice_send","subject_template":"Invoice {{ invoice_number }}","body_template":"Hello {{ customer_name }}, amount due {{ amount_due }}","is_active":true}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/emails/send \
  -H "Authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"to_email":"ops@example.com","subject":"Ops alert","body":"The nightly export completed successfully."}'

curl -X POST http://localhost:8000/organizations/$ORG_ID/invoices/$INVOICE_ID/send-email \
  -H "Authorization: Bearer $ACCESS"

curl -G http://localhost:8000/organizations/$ORG_ID/notifications \
  -H "Authorization: Bearer $ACCESS"
```

## Inventory foundation

The inventory module keeps stock, valuation, and movement truth on the backend:
- Organization-scoped item master data supports sellable, purchasable, and tracked inventory items.
- Weighted-average costing is the active valuation method for tracked stock.
- Inventory movements are append-only, audit-linked, and reversible rather than destructively edited.
- Bill posting creates inbound stock movements for tracked items and debits the configured inventory asset account.
- Invoice posting creates outbound stock movements, relieves inventory using the current weighted-average cost, and books a COGS foundation line against the item's expense account.
- Manual stock adjustments create both inventory movements and balancing journals using an explicit offset account.
- Locations are implemented as a lightweight warehouse foundation for future transfers and warehouse-aware reporting.
- Negative inventory is currently disallowed and enforced at the service layer.

### Inventory endpoints

- `POST /organizations/{organization_id}/items`
- `GET /organizations/{organization_id}/items`
- `GET /organizations/{organization_id}/items/search`
- `GET /organizations/{organization_id}/items/{item_id}`
- `PATCH /organizations/{organization_id}/items/{item_id}`
- `DELETE /organizations/{organization_id}/items/{item_id}`
- `POST /organizations/{organization_id}/inventory/locations`
- `GET /organizations/{organization_id}/inventory/locations`
- `GET /organizations/{organization_id}/inventory/locations/{location_id}`
- `PATCH /organizations/{organization_id}/inventory/locations/{location_id}`
- `GET /organizations/{organization_id}/inventory/balances`
- `GET /organizations/{organization_id}/inventory/items/{item_id}/balance`
- `GET /organizations/{organization_id}/inventory/items/{item_id}/movements`
- `GET /organizations/{organization_id}/inventory/stock-on-hand`
- `GET /organizations/{organization_id}/inventory/valuation`
- `POST /organizations/{organization_id}/inventory/adjustments`
- `GET /organizations/{organization_id}/inventory/adjustments`
- `GET /organizations/{organization_id}/inventory/adjustments/{adjustment_id}`

### Inventory notes and current deferrals

- `invoice_items` and `bill_items` now accept optional `item_id` and `location_id`; service lines without an item continue to work.
- Tracked inventory purchasing recognizes stock when the bill is posted, not when the draft is created.
- Tracked inventory sales recognize stock when the invoice is posted, not when the draft is created or sent.
- Purchase receiving workflows, warehouse transfers, serial/lot tracking, manufacturing, and advanced valuation layers remain deferred for later modules.


## Projects / job costing foundation

The projects module adds organization-scoped job costing foundations while keeping the GL as the single accounting source of truth:
- `projects`, `project_cost_entries`, `project_revenue_entries`, `project_time_entries`, and `project_status_history` persist project master data plus analytical financial/activity records.
- Project profitability is derived from project-linked posted bills, invoices, time entries, and project-side reversal entries; it is not a second set of books.
- Revenue attribution is recognized for reporting when project-linked invoices are posted. Cost attribution is recognized when project-linked bills are posted and when tracked-inventory invoice posting creates COGS movements.
- Draft document lines may optionally carry `project_id`, but project linkage is validated server-side for organization scope, active/archive semantics, and invoice customer compatibility.
- Time entries are intentionally a backend-only foundation: billable flags and rate capture are stored now, while approvals, billing automation, payroll integration, richer UX, retainers, and milestone billing remain deferred.
- Archive semantics are safe: projects are soft-archived, history is retained, and reversals preserve traceability back to source documents and journals.

### Project endpoints

- `POST /organizations/{organization_id}/projects`
- `GET /organizations/{organization_id}/projects`
- `GET /organizations/{organization_id}/projects/search`
- `GET /organizations/{organization_id}/projects/{project_id}`
- `PATCH /organizations/{organization_id}/projects/{project_id}`
- `DELETE /organizations/{organization_id}/projects/{project_id}`
- `GET /organizations/{organization_id}/projects/{project_id}/costs`
- `GET /organizations/{organization_id}/projects/{project_id}/revenue`
- `GET /organizations/{organization_id}/projects/{project_id}/activity`
- `GET /organizations/{organization_id}/projects/{project_id}/profitability`
- `POST /organizations/{organization_id}/projects/{project_id}/budget`
- `PATCH /organizations/{organization_id}/projects/{project_id}/budget`
- `GET /organizations/{organization_id}/projects/{project_id}/budget`
- `POST /organizations/{organization_id}/projects/{project_id}/time-entries`
- `GET /organizations/{organization_id}/projects/{project_id}/time-entries`
- `PATCH /organizations/{organization_id}/projects/{project_id}/time-entries/{time_entry_id}`
- `DELETE /organizations/{organization_id}/projects/{project_id}/time-entries/{time_entry_id}`
- `GET /organizations/{organization_id}/project-profitability`
- `GET /organizations/{organization_id}/project-budget-vs-actual`
- `GET /organizations/{organization_id}/project-summary`

### Project reporting assumptions

- Budget vs actual currently reports budgeted revenue/cost/hours alongside actual revenue, actual cost, actual hours, and derived variances per project.
- Project activity timelines combine status history, analytical cost/revenue entries, and time entries so reports can trace profitability back to source documents.
- Frontend profitability truth is intentionally deferred; consumers should use the backend reporting endpoints above.


## Payroll foundation

The payroll module adds a backend-first gross-to-net and posting foundation while keeping compliance-specific logic deferred:
- Employee master records store employment status, salary/hourly defaults, and payroll settings/account mappings per organization.
- Payroll periods and runs are separate from financial periods, but posting still respects the accounting calendar through the journal service.
- Payroll calculations produce immutable run entries and line-item payslip data for earnings, employee deductions, and employer costs using Decimal-safe arithmetic only.
- Posting debits payroll expense accounts, credits deduction liability accounts, and credits the selected funding account for net pay; posted payroll runs cannot be recalculated, and reversals flow through the journal reversal mechanism.
- Employee payroll history and liability reporting stay analytical and traceable back to payroll entries, line items, and posted/reversal journals.
- Country-specific tax engines, pension provider integrations, payroll payment execution, and richer HR/time UX remain deferred.

### Payroll endpoints

- `POST /organizations/{organization_id}/employees`
- `GET /organizations/{organization_id}/employees`
- `GET /organizations/{organization_id}/employees/{employee_id}`
- `GET /organizations/{organization_id}/employees/{employee_id}/payroll-history`
- `PATCH /organizations/{organization_id}/employees/{employee_id}`
- `DELETE /organizations/{organization_id}/employees/{employee_id}`
- `POST /organizations/{organization_id}/payroll-earning-types`
- `GET /organizations/{organization_id}/payroll-earning-types`
- `PATCH /organizations/{organization_id}/payroll-earning-types/{earning_type_id}`
- `POST /organizations/{organization_id}/payroll-deduction-types`
- `GET /organizations/{organization_id}/payroll-deduction-types`
- `PATCH /organizations/{organization_id}/payroll-deduction-types/{deduction_type_id}`
- `POST /organizations/{organization_id}/payroll-periods`
- `GET /organizations/{organization_id}/payroll-periods`
- `GET /organizations/{organization_id}/payroll-periods/{period_id}`
- `POST /organizations/{organization_id}/payroll-runs`
- `GET /organizations/{organization_id}/payroll-runs`
- `GET /organizations/{organization_id}/payroll-runs/{run_id}`
- `POST /organizations/{organization_id}/payroll-runs/{run_id}/calculate`
- `POST /organizations/{organization_id}/payroll-runs/{run_id}/post`
- `POST /organizations/{organization_id}/payroll-runs/{run_id}/reverse`
- `GET /organizations/{organization_id}/payroll-runs/{run_id}/entries`
- `GET /organizations/{organization_id}/payroll-entries/{entry_id}`
- `GET /organizations/{organization_id}/payroll-summary`
- `GET /organizations/{organization_id}/payroll-liabilities`

## AI / automation layer foundation

The AI and automation layer is backend-governed, audit-safe, and intentionally non-authoritative:
- Automation rules provide deterministic, explainable matching for bank-transaction categorization and document coding suggestions using constrained condition operators and priority ordering.
- Suggestions are stored with lifecycle state, confidence, explainability metadata, provider provenance, expiry, and reviewer feedback so advisory outputs remain traceable.
- Document-intelligence jobs operate on existing uploaded files, classify them heuristically, extract reviewable structured fields, and persist both the extraction job record and the underlying AI processing job.
- Reconciliation and coding assistance never bypass existing accounting workflows; suggestion acceptance remains advisory by default, and only explicitly safe, feature-flagged bank-transaction updates can auto-apply through the existing bank transaction service.
- AI processing jobs and reconciliation suggestion sets provide queue/job visibility, retry-safe status tracking foundations, and audit hooks for future asynchronous workers.
- External model dependence is intentionally deferred: the current provider adapter uses local deterministic heuristics so the module stays testable without network access or opaque black-box writes.

### AI / automation endpoints

- `POST /organizations/{organization_id}/automation-rules`
- `GET /organizations/{organization_id}/automation-rules`
- `GET /organizations/{organization_id}/automation-rules/{rule_id}`
- `PATCH /organizations/{organization_id}/automation-rules/{rule_id}`
- `DELETE /organizations/{organization_id}/automation-rules/{rule_id}`
- `POST /organizations/{organization_id}/automation-rules/{rule_id}/test`
- `GET /organizations/{organization_id}/suggestions`
- `GET /organizations/{organization_id}/suggestions/{suggestion_id}`
- `GET /organizations/{organization_id}/suggestions/for/{entity_type}/{entity_id}`
- `POST /organizations/{organization_id}/suggestions/{suggestion_id}/accept`
- `POST /organizations/{organization_id}/suggestions/{suggestion_id}/reject`
- `POST /organizations/{organization_id}/document-intelligence/extract`
- `GET /organizations/{organization_id}/document-intelligence/jobs`
- `GET /organizations/{organization_id}/document-intelligence/jobs/{job_id}`
- `GET /organizations/{organization_id}/document-intelligence/jobs/{job_id}/result`
- `POST /organizations/{organization_id}/bank-transactions/{bank_transaction_id}/generate-suggestions`
- `GET /organizations/{organization_id}/bank-transactions/{bank_transaction_id}/suggestions`
- `POST /organizations/{organization_id}/documents/{entity_type}/{entity_id}/generate-coding-suggestions`
- `GET /organizations/{organization_id}/documents/{entity_type}/{entity_id}/coding-suggestions`
- `GET /organizations/{organization_id}/ai-jobs`
- `GET /organizations/{organization_id}/ai-jobs/{job_id}`

### AI safety notes and current deferrals

- Suggestions do not become accounting truth. Accepted suggestions can be reviewed without changing books, and only safe bank-transaction coding updates can be auto-applied when `ai_auto_apply_safe_workflows=true`.
- Document extraction currently supports uploaded text and CSV content best; PDFs and images are intentionally deferred to future provider integrations while the job/audit contract stays stable.
- Rule conflict handling is priority-based per suggestion type: the highest-priority matching rule wins for a given target and suggestion type.
- Rejected or expired suggestions cannot be silently reused; regeneration creates a fresh suggestion record with a new fingerprint and review cycle.


## Consolidation foundation

This milestone adds backend-driven multi-entity consolidation for Xero-class financial reporting:
- consolidation groups that define reporting currency and entity scope
- group memberships with org-boundary and permission checks
- consolidation runs that produce persisted balance sheet, income statement, and trial balance snapshots
- automatic intercompany elimination detection scaffolding plus manual elimination journals
- basic FX conversion inputs for non-reporting-currency entities
- group-level reporting endpoints under `/groups/{group_id}` for consolidated statements and eliminations

### Consolidation endpoints

- `POST /organizations/{organization_id}/groups`
- `GET /organizations/{organization_id}/groups`
- `GET /organizations/{organization_id}/groups/{group_id}`
- `PATCH /organizations/{organization_id}/groups/{group_id}`
- `POST /groups/{group_id}/entities`
- `GET /groups/{group_id}/entities`
- `DELETE /groups/{group_id}/entities/{entity_id}`
- `POST /groups/{group_id}/consolidations/run`
- `GET /groups/{group_id}/consolidations`
- `GET /groups/{group_id}/consolidations/{run_id}`
- `GET /groups/{group_id}/eliminations`
- `POST /groups/{group_id}/eliminations`
- `GET /groups/{group_id}/eliminations/{elimination_id}`
- `GET /groups/{group_id}/reports/balance-sheet`
- `GET /groups/{group_id}/reports/income-statement`
- `GET /groups/{group_id}/reports/trial-balance`
