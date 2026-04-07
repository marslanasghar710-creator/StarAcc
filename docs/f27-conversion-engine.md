# F27 Conversion Engine

## Canonical funnel stages
`acquired` → `engaged` → `demo_entered` → `signup_started` → `authenticated` → `workspace_started` → `workspace_created` → `activation_started` → `activated` → `handoff_to_app`

## Canonical event naming
All events use dot notation: `{surface}.{object}.{action}`.
Examples:
- `marketing.landing.viewed`
- `marketing.section.viewed`
- `marketing.cta.clicked`
- `demo.workspace.entered`
- `auth.signup.completed`
- `workspace.creation.completed`
- `activation.completed`
- `app.handoff.completed`

## Event envelope contract
The frontend tracker emits a typed shared envelope with:
- identity: `session_id`, `anonymous_id`, optional `user_id` / `org_id`
- context: `route`, `page_type`, `surface`, `funnel_domain`, `funnel_stage`
- attribution: `utm_*`, `referrer`, `landing_variant`, `experiment_assignments`
- device: `device_type`, `viewport_bucket`, `locale`, `timezone`
- versioning: `event_name`, `event_version`, `occurred_at`
- event payload: `payload`

Backend endpoint: `POST /analytics/events`.

## Minimum shipped events
- Marketing: `marketing.landing.viewed`, `marketing.section.viewed`, `marketing.cta.clicked`
- Demo: `demo.entry.started`, `demo.workspace.entered`, `demo.convert_to_signup.clicked`
- Auth: `auth.signup.started`, `auth.signup.completed`, `auth.login.completed`
- Workspace: `workspace.creation.started`, `workspace.creation.completed`
- Activation: `activation.flow.entered`, `activation.checklist.viewed`, `activation.checklist_item.completed`, `activation.completed`
- App handoff: `app.handoff.completed`

## Attribution continuity
Attribution is persisted in local storage as first-touch and latest-touch snapshots and reused across marketing → signup → workspace creation events.

## Demo vs real separation
Events include `surface`, `funnel_domain`, and optional `is_demo`, enabling clean segmentation of demo exploration vs real signup/activation reporting.
