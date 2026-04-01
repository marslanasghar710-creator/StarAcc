from __future__ import annotations

from app.core.config import settings
from app.core.exceptions import forbidden
from app.seed.runner import list_scenarios, run_scenario


class DemoSeedService:
    def __init__(self, db):
        self.db = db

    def list_scenarios(self):
        return list_scenarios()

    def provision(self, scenario_key: str, *, reset: bool = False):
        if reset and settings.environment.lower() in {"prod", "production"}:
            raise forbidden("Demo scenario reset is disabled in production")
        summary = run_scenario(self.db, scenario_key, reset=reset)
        return {
            "scenario_key": summary.scenario_key,
            "organization_id": summary.organization_id,
            "organization_name": summary.organization_name,
            "counters": summary.counters,
            "diagnostics": summary.diagnostics,
        }
