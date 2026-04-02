from __future__ import annotations

from app.seed.builders.accounting import ensure_chart_of_accounts, seed_parties, seed_transactions
from app.seed.builders.organizations import ensure_demo_users, provision_demo_organization
from app.seed.contracts import SeedContext, SeedSummary


def seed_demo_company_uk(context: SeedContext) -> SeedSummary:
    org = provision_demo_organization(context, name="Thames Services Ltd", base_currency="GBP", timezone="Europe/London")
    users = ensure_demo_users(context, org.id, context.scenario_key)
    actor = users["owner"]
    context.actor_user_id = str(actor.id)

    summary = SeedSummary(scenario_key=context.scenario_key, organization_id=str(org.id), organization_name=org.name)
    accounts = ensure_chart_of_accounts(context, org.id, str(actor.id))
    customers, suppliers = seed_parties(context, str(org.id), summary)
    seed_transactions(context, str(org.id), str(actor.id), accounts, customers, suppliers, summary)
    summary.diagnostics["localization"] = "uk-services"
    return summary
