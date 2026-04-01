from __future__ import annotations

from datetime import datetime, timezone

from app.seed.contracts import SeedContext, SeedSummary
from app.seed.scenarios.demo_company_uk import seed_demo_company_uk
from app.seed.scenarios.demo_company_us import seed_demo_company_us
from app.seed.scenarios.group_consolidation_demo import seed_group_consolidation_demo
from app.seed.utils.deterministic import deterministic_rng

UTC = timezone.utc
SEED_VERSION = "f19-v1"

SCENARIO_REGISTRY = {
    "demo_company_us": seed_demo_company_us,
    "demo_company_uk": seed_demo_company_uk,
    "group_consolidation_demo": seed_group_consolidation_demo,
}


def list_scenarios() -> list[dict[str, str]]:
    return [
        {"key": "demo_company_us", "name": "Scenario A — SME Trading Company (US)", "description": "Default operational demo with AR/AP, banking, inventory, projects, payroll, and reporting activity."},
        {"key": "demo_company_uk", "name": "Scenario B — Services Company (UK)", "description": "Services-heavy profile with project-driven revenue/cost patterns and reduced inventory emphasis."},
        {"key": "group_consolidation_demo", "name": "Scenario C — Consolidation Demo", "description": "Parent-plus-subsidiaries setup with seeded consolidation run and elimination-ready structure."},
    ]


def run_scenario(db, scenario_key: str, *, reset: bool = False) -> SeedSummary:
    if scenario_key not in SCENARIO_REGISTRY:
        raise ValueError(f"Unknown scenario '{scenario_key}'")

    now = datetime.now(UTC)
    context = SeedContext(
        db=db,
        scenario_key=scenario_key,
        seed_version=SEED_VERSION,
        now=now,
        rng=deterministic_rng(f"{scenario_key}:{SEED_VERSION}"),
        reset=reset,
    )

    summary = SCENARIO_REGISTRY[scenario_key](context)
    db.commit()
    return summary
