from datetime import datetime, timezone

import pytest

from app.seed.runner import SEED_VERSION, list_scenarios
from app.seed.utils.deterministic import deterministic_rng, stable_suffix
from app.services.demo_seed_service import DemoSeedService

UTC = timezone.utc


@pytest.fixture(autouse=True)
def _seed():
    # Override global RBAC seeding fixture for pure unit checks in this module.
    return None



def test_deterministic_rng_repeatable():
    first = deterministic_rng("demo_company_us:f19-v1")
    second = deterministic_rng("demo_company_us:f19-v1")
    assert [first.randint(0, 1000) for _ in range(5)] == [second.randint(0, 1000) for _ in range(5)]


def test_stable_suffix_repeatable():
    assert stable_suffix("scenario", 3) == stable_suffix("scenario", 3)
    assert stable_suffix("scenario", 3) != stable_suffix("scenario", 4)


def test_scenario_registry_contains_required_scenarios():
    keys = {item["key"] for item in list_scenarios()}
    assert {"demo_company_us", "demo_company_uk", "group_consolidation_demo"}.issubset(keys)


def test_demo_seed_service_blocks_prod_reset(monkeypatch):
    class DummyDB:
        pass

    service = DemoSeedService(DummyDB())
    monkeypatch.setattr("app.services.demo_seed_service.settings.environment", "production")
    with pytest.raises(Exception):
        service.provision("demo_company_us", reset=True)


def test_seed_version_is_declared():
    assert SEED_VERSION.startswith("f19-")
    assert datetime.now(UTC)
