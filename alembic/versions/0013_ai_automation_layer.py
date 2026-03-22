"""ai automation layer foundation

Revision ID: 0013_ai_automation_layer
Revises: 0012_payroll_reversal_support
Create Date: 2026-03-22
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0013_ai_automation_layer"
down_revision = "0012_payroll_reversal_support"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "automation_rules",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("rule_type", sa.Enum("BANK_TRANSACTION_CATEGORIZATION", "DOCUMENT_ROUTING", "ACCOUNT_CODING", "TAX_TREATMENT", "PAYABLE_TAGGING", "RECEIVABLE_TAGGING", name="automationruletype"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("conditions_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("actions_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_automation_rules_organization_id", "automation_rules", ["organization_id"])
    op.create_index("ix_automation_rules_priority", "automation_rules", ["priority"])

    op.create_table(
        "suggestions",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("target_entity_type", sa.String(length=50), nullable=False),
        sa.Column("target_entity_id", sa.String(length=100), nullable=False),
        sa.Column("suggestion_type", sa.String(length=100), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "APPLIED", name="suggestionstatus"), nullable=False),
        sa.Column("confidence_score", sa.Numeric(10, 4), nullable=True),
        sa.Column("reason_summary", sa.String(length=500), nullable=False),
        sa.Column("explanation_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("suggested_payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("source_type", sa.Enum("RULE", "MODEL", "HYBRID", "HEURISTIC", name="suggestionsourcetype"), nullable=False),
        sa.Column("provider_name", sa.String(length=100), nullable=True),
        sa.Column("provider_model", sa.String(length=100), nullable=True),
        sa.Column("provider_version", sa.String(length=50), nullable=True),
        sa.Column("input_fingerprint", sa.String(length=128), nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_suggestions_org_target", "suggestions", ["organization_id", "target_entity_type", "target_entity_id"])
    op.create_index("ix_suggestions_org_status", "suggestions", ["organization_id", "status"])
    op.create_index("ix_suggestions_org_type", "suggestions", ["organization_id", "suggestion_type"])

    op.create_table(
        "suggestion_feedback",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("suggestion_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suggestions.id"), nullable=False),
        sa.Column("action", sa.Enum("ACCEPTED", "REJECTED", "IGNORED", name="suggestionfeedbackaction"), nullable=False),
        sa.Column("feedback_reason", sa.Text(), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_suggestion_feedback_org_suggestion", "suggestion_feedback", ["organization_id", "suggestion_id"])

    op.create_table(
        "document_extraction_jobs",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("file_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stored_files.id"), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "RUNNING", "SUCCEEDED", "FAILED", name="documentextractionstatus"), nullable=False),
        sa.Column("classifier_label", sa.Enum("INVOICE", "BILL", "RECEIPT", "STATEMENT", "UNKNOWN", name="documentclassifierlabel"), nullable=True),
        sa.Column("classifier_confidence", sa.Numeric(10, 4), nullable=True),
        sa.Column("extracted_fields_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("review_required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("provider_name", sa.String(length=100), nullable=True),
        sa.Column("provider_model", sa.String(length=100), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_document_extraction_jobs_org_status", "document_extraction_jobs", ["organization_id", "status"])
    op.create_index("ix_document_extraction_jobs_org_file", "document_extraction_jobs", ["organization_id", "file_id"])

    op.create_table(
        "reconciliation_suggestion_sets",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("bank_transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bank_transactions.id"), nullable=False),
        sa.Column("generation_status", sa.Enum("PENDING", "RUNNING", "SUCCEEDED", "FAILED", "DEAD_LETTER", name="aijobstatus"), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_summary_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reconciliation_suggestion_sets_org_bank", "reconciliation_suggestion_sets", ["organization_id", "bank_transaction_id"])

    op.create_table(
        "ai_processing_jobs",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("job_type", sa.Enum("DOCUMENT_EXTRACTION", "RECONCILIATION_SUGGESTIONS", "CODING_SUGGESTIONS", "ANOMALY_SCAN", name="aijobtype"), nullable=False),
        sa.Column("target_entity_type", sa.String(length=50), nullable=False),
        sa.Column("target_entity_id", sa.String(length=100), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "RUNNING", "SUCCEEDED", "FAILED", "DEAD_LETTER", name="aijobstatus", create_type=False), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("result_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_processing_jobs_org_status", "ai_processing_jobs", ["organization_id", "status"])
    op.create_index("ix_ai_processing_jobs_org_target", "ai_processing_jobs", ["organization_id", "target_entity_type", "target_entity_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_processing_jobs_org_target", table_name="ai_processing_jobs")
    op.drop_index("ix_ai_processing_jobs_org_status", table_name="ai_processing_jobs")
    op.drop_table("ai_processing_jobs")
    op.drop_index("ix_reconciliation_suggestion_sets_org_bank", table_name="reconciliation_suggestion_sets")
    op.drop_table("reconciliation_suggestion_sets")
    op.drop_index("ix_document_extraction_jobs_org_file", table_name="document_extraction_jobs")
    op.drop_index("ix_document_extraction_jobs_org_status", table_name="document_extraction_jobs")
    op.drop_table("document_extraction_jobs")
    op.drop_index("ix_suggestion_feedback_org_suggestion", table_name="suggestion_feedback")
    op.drop_table("suggestion_feedback")
    op.drop_index("ix_suggestions_org_type", table_name="suggestions")
    op.drop_index("ix_suggestions_org_status", table_name="suggestions")
    op.drop_index("ix_suggestions_org_target", table_name="suggestions")
    op.drop_table("suggestions")
    op.drop_index("ix_automation_rules_priority", table_name="automation_rules")
    op.drop_index("ix_automation_rules_organization_id", table_name="automation_rules")
    op.drop_table("automation_rules")
