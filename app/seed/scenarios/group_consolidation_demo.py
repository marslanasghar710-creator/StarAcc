from __future__ import annotations

from datetime import timedelta

from app.schemas.consolidation import ConsolidationGroupCreate, ConsolidationRunCreate, GroupEntityCreate
from app.seed.contracts import SeedContext, SeedSummary
from app.seed.scenarios.demo_company_us import seed_demo_company_us
from app.seed.scenarios.demo_company_uk import seed_demo_company_uk
from app.services.reporting.consolidation_service import ConsolidationService


def seed_group_consolidation_demo(context: SeedContext) -> SeedSummary:
    us_ctx = SeedContext(db=context.db, scenario_key="demo_company_us", seed_version=context.seed_version, now=context.now, rng=context.rng, reset=context.reset)
    uk_ctx = SeedContext(db=context.db, scenario_key="demo_company_uk", seed_version=context.seed_version, now=context.now, rng=context.rng, reset=context.reset)

    us = seed_demo_company_us(us_ctx)
    uk = seed_demo_company_uk(uk_ctx)

    service = ConsolidationService(context.db)
    actor_user_id = us_ctx.actor_user_id

    group = service.create_group(
        us.organization_id,
        actor_user_id,
        ConsolidationGroupCreate(name="Demo Holdings Group", reporting_currency="USD", description="F19 consolidation seed scenario"),
    )
    service.add_group_entity(str(group.id), actor_user_id, GroupEntityCreate(organization_id=us.organization_id, ownership_percentage=100, is_primary=True))
    service.add_group_entity(str(group.id), actor_user_id, GroupEntityCreate(organization_id=uk.organization_id, ownership_percentage=100, is_primary=False))

    run = service.run_consolidation(
        str(group.id),
        actor_user_id,
        ConsolidationRunCreate(
            period_start=context.now.date() - timedelta(days=120),
            period_end=context.now.date(),
            entity_ids=[us.organization_id, uk.organization_id],
            fx_rates=[],
        ),
    )

    summary = SeedSummary(
        scenario_key=context.scenario_key,
        organization_id=us.organization_id,
        organization_name="Demo Holdings Group",
        counters={"consolidation_groups": 1, "consolidation_runs": 1},
        diagnostics={"group_id": str(group.id), "run_id": str(run.id), "subsidiary_org_ids": [us.organization_id, uk.organization_id]},
    )
    return summary
