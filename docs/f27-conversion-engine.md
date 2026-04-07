# F27 Conversion Engine

## Funnel stages
1. **Landing discovery** (`/`) with dual CTA paths: demo vs real workspace.
2. **Demo exploration** (`/demo`) with explicit isolated-data messaging.
3. **Signup** (`/register` then `/login?redirectTo=/start`).
4. **Workspace creation + activation bridge** (`/start`).
5. **Setup center activation** (`/setup`) with backend-driven checklist.

## Key routes
- `/` landing + conversion sections
- `/demo` demo entry path
- `/register` account signup
- `/login` auth entry (redirect defaults to `/start`)
- `/start` workspace creation and activation handoff
- `/setup` deterministic checklist and completion tracking

## Event taxonomy
Tracked via `frontend/src/features/funnel/analytics.ts` and ingested by `POST /analytics/events`.

Core events:
- `landing_viewed`, `landing_cta_clicked`, `features_viewed`, `faq_interacted`
- `demo_entered`
- `signup_started`, `signup_completed`
- `workspace_creation_started`, `workspace_created`
- `activation_entered`, `activation_checklist_item_completed`, `first_business_action_completed`, `activation_completed`

All events include timestamp, anonymous/session IDs, route, attribution fields (UTM/referrer), and metadata.

## Activation completion rules
Activation state is backend-authoritative through onboarding status:
- progress and tasks come from `OnboardingService.get_status`
- readiness signals are computed from real org/accounting state (e.g., first transaction exists)
- completion is emitted when progress reaches 100%

## Demo vs real separation
- Demo path is public and clearly labeled as isolated sample data.
- Real conversion path creates authenticated user + real organization workspace.
- Funnel metadata supports segmentation through event metadata and `experience` fields.

## Extension points
- Add hero/CTA experiments by passing `experiment_bucket` in event metadata.
- Expand attribution persistence for paid channels in `rememberAttributionContext()`.
- Add server-side warehouse forwarders by extending `AnalyticsService.track_funnel_event`.
