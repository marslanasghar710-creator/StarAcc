export type IntegrationProvider = {
  key: string;
  name: string;
  category: string;
  status: string;
  auth_type: string;
  capabilities: Record<string, unknown>;
  supports_webhooks: boolean;
  supports_scheduled_sync: boolean;
  supports_push: boolean;
  supports_pull: boolean;
  supports_manual_import: boolean;
  is_public: boolean;
  is_internal: boolean;
  required_feature?: string | null;
  is_entitled: boolean;
};

export type IntegrationConnection = {
  id: string;
  provider_key: string;
  display_name: string;
  status: string;
  connection_mode: string;
  external_account_id?: string | null;
  last_sync_at?: string | null;
  last_success_at?: string | null;
  last_error_at?: string | null;
  last_error_code?: string | null;
  last_error_message?: string | null;
  config_json: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
};

export type IntegrationSyncRun = {
  id: string;
  provider_key: string;
  sync_type: string;
  direction: string;
  status: string;
  triggered_by: string;
  started_at?: string | null;
  completed_at?: string | null;
  records_seen: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
  error_summary?: string | null;
};

export type ExternalSourceAccount = {
  external_account_id: string;
  label: string;
  currency?: string | null;
  account_type?: string | null;
};

export type ImportSummary = {
  imported_count: number;
  duplicate_count: number;
  failed_count: number;
  skipped_count: number;
  job_id?: string | null;
};
