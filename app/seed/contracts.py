from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from random import Random
from typing import Any

from sqlalchemy.orm import Session


@dataclass(slots=True)
class SeedSummary:
    scenario_key: str
    organization_id: str
    organization_name: str
    counters: dict[str, int] = field(default_factory=dict)
    diagnostics: dict[str, Any] = field(default_factory=dict)

    def bump(self, key: str, value: int = 1) -> None:
        self.counters[key] = self.counters.get(key, 0) + value


@dataclass(slots=True)
class SeedContext:
    db: Session
    scenario_key: str
    seed_version: str
    now: datetime
    rng: Random
    reset: bool
    actor_user_id: str | None = None
