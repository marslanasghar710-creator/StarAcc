import pytest

from app.onboarding.domain.steps import PERSONA_PRIORITIES, TASK_DEFINITIONS


@pytest.fixture(autouse=True)
def _seed():
    return None


def test_onboarding_tasks_include_foundational_required_items():
    keys = {task.key for task in TASK_DEFINITIONS if task.required}
    assert {"set-company-details", "confirm-fiscal-year", "setup-chart-of-accounts", "configure-tax", "add-bank-account", "create-first-transaction", "view-first-report"}.issubset(keys)


def test_persona_priorities_reference_valid_tasks():
    task_keys = {task.key for task in TASK_DEFINITIONS}
    for persona, priorities in PERSONA_PRIORITIES.items():
        assert persona
        assert set(priorities).issubset(task_keys)
