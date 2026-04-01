"""F19 demo/seed bootstrap runner.

Usage:
  python scripts/seed_demo_data.py --scenario demo_company_us
  python scripts/seed_demo_data.py --scenario all --reset
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.seed.runner import SCENARIO_REGISTRY, list_scenarios, run_scenario

UTC = timezone.utc


def _guard_reset(reset: bool) -> None:
    if reset and settings.environment.lower() in {"prod", "production"}:
        raise RuntimeError("Resettable demo seeding is disabled in production environments.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed isolated demo organizations for StarAcc")
    parser.add_argument("--scenario", default="demo_company_us", help="Scenario key or 'all'")
    parser.add_argument("--reset", action="store_true", help="Delete/recreate matching demo scenario organizations in non-prod")
    parser.add_argument("--list", action="store_true", help="List available scenarios")
    args = parser.parse_args()

    if args.list:
        print(json.dumps(list_scenarios(), indent=2))
        return

    _guard_reset(args.reset)

    selected = list(SCENARIO_REGISTRY.keys()) if args.scenario == "all" else [args.scenario]

    engine = create_engine(settings.database_url)
    seeded = []
    started = datetime.now(UTC)

    with Session(engine) as db:
        for key in selected:
            print(f"[seed] starting scenario={key}")
            summary = run_scenario(db, key, reset=args.reset)
            seeded.append({
                "scenario": summary.scenario_key,
                "organization_id": summary.organization_id,
                "organization_name": summary.organization_name,
                "counters": summary.counters,
                "diagnostics": summary.diagnostics,
            })
            print(f"[seed] complete scenario={key} org={summary.organization_name} id={summary.organization_id}")

    elapsed = (datetime.now(UTC) - started).total_seconds()
    print(json.dumps({"seed_version": "f19-v1", "scenarios": seeded, "elapsed_seconds": elapsed}, indent=2, default=str))


if __name__ == "__main__":
    main()
