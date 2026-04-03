from dataclasses import dataclass

from app.core.enums import IntegrationAuthType, IntegrationSyncDirection


@dataclass(frozen=True)
class IntegrationProviderDefinition:
    key: str
    name: str
    category: str
    auth_type: IntegrationAuthType
    supports_webhooks: bool
    supports_scheduled_sync: bool
    supports_push: bool
    supports_pull: bool
    supports_manual_import: bool
    is_public: bool
    is_internal: bool
    capabilities: dict[str, bool | list[str]]
    required_feature: str | None = None


INTEGRATION_PROVIDER_REGISTRY: dict[str, IntegrationProviderDefinition] = {
    "bank_feed_sandbox": IntegrationProviderDefinition(
        key="bank_feed_sandbox",
        name="Bank Feed Sandbox",
        category="banking",
        auth_type=IntegrationAuthType.API_KEY,
        supports_webhooks=False,
        supports_scheduled_sync=True,
        supports_push=False,
        supports_pull=True,
        supports_manual_import=True,
        is_public=True,
        is_internal=False,
        required_feature="integrations_basic",
        capabilities={
            "connect": True,
            "manual_sync": True,
            "directions": [IntegrationSyncDirection.PULL.value],
            "resources": ["bank_transactions"],
        },
    ),
    "payments_sandbox": IntegrationProviderDefinition(
        key="payments_sandbox",
        name="Payments Sandbox",
        category="payments",
        auth_type=IntegrationAuthType.WEBHOOK_SECRET,
        supports_webhooks=True,
        supports_scheduled_sync=False,
        supports_push=False,
        supports_pull=False,
        supports_manual_import=False,
        is_public=True,
        is_internal=False,
        required_feature="integrations_advanced",
        capabilities={
            "connect": True,
            "webhooks": True,
            "directions": [IntegrationSyncDirection.PULL.value],
            "resources": ["payment_events"],
        },
    ),
    "contacts_sandbox": IntegrationProviderDefinition(
        key="contacts_sandbox",
        name="Contacts CRM Sandbox",
        category="crm",
        auth_type=IntegrationAuthType.OAUTH2,
        supports_webhooks=True,
        supports_scheduled_sync=True,
        supports_push=True,
        supports_pull=True,
        supports_manual_import=True,
        is_public=True,
        is_internal=False,
        required_feature="integrations_basic",
        capabilities={
            "connect": True,
            "directions": [IntegrationSyncDirection.PULL.value, IntegrationSyncDirection.PUSH.value],
            "resources": ["customers"],
            "bidirectional_safe": ["customers"],
        },
    ),
    "generic_webhook": IntegrationProviderDefinition(
        key="generic_webhook",
        name="Generic Webhook",
        category="developer",
        auth_type=IntegrationAuthType.WEBHOOK_SECRET,
        supports_webhooks=True,
        supports_scheduled_sync=False,
        supports_push=False,
        supports_pull=True,
        supports_manual_import=False,
        is_public=False,
        is_internal=True,
        required_feature="integrations_advanced",
        capabilities={
            "connect": True,
            "webhooks": True,
            "resources": ["custom_events"],
        },
    ),
}
