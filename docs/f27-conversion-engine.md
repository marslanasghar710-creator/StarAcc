# F27 Conversion Engine — Analytics + Activation Contract

## Funnel taxonomy (F27B)
Canonical stages:
`acquired → engaged → demo_entered → signup_started → authenticated → workspace_started → workspace_created → activation_started → activated → handoff_to_app`

Canonical event naming uses dot notation (`{surface}.{object}.{action}`), with typed envelope fields:
- `event_name`, `event_version`, `occurred_at`
- `session_id`, `anonymous_id`, optional `user_id`, `org_id`, `workspace_id`
- `page_type`, `surface`, `funnel_domain`, `funnel_stage`
- attribution (`utm_*`, `referrer`, `landing_variant`, `experiment_assignments`)
- device/locale context
- `payload`

## Activation checklist contract (F27C)
Checklist version: `v1` (org-scoped, backend-evaluated, sticky completion).

### Item IDs
- `org_created`
- `settings_reviewed`
- `chart_of_accounts_ready`
- `bank_account_added`
- `customer_added`
- `supplier_added`
- `first_invoice_created`
- `first_bill_created`
- `bank_import_started`
- `first_reconciliation_started`
- `teammate_invited`

### Activation completion rule (v1)
An org is `completed` when:
1. Foundation complete:
   - `org_created`
   - `settings_reviewed`
   - `chart_of_accounts_ready`
2. Plus at least one operational setup item:
   - `bank_account_added` OR `customer_added` OR `supplier_added`
3. Plus at least one workflow-start item:
   - `first_invoice_created` OR `first_bill_created` OR `bank_import_started` OR `first_reconciliation_started`

### Snapshot shape
Backend returns one canonical snapshot with:
- item states (`pending|complete|blocked|hidden`) and compact evidence
- completion metrics and required counts
- milestone flags
- recommended next item IDs
- timestamps (`activated_at`, `last_evaluated_at`)

### Presentation preferences
Stored separately from completion truth:
- `checklist_dismissed`
- `app_banner_dismissed`
- `preferred_surface`

## Backend endpoints
- `GET /organizations/{organization_id}/activation/snapshot`
- `POST /organizations/{organization_id}/activation/confirm-settings-reviewed`
- `POST /organizations/{organization_id}/activation/presentation-preferences`

## Emission / source of truth
- Durable completion transitions are backend-evaluated and diffed.
- `activation.checklist_item.completed` and `activation.completed` are emitted from snapshot transition deltas.
- Frontend never marks checklist completion as durable truth without refreshed backend snapshot.
