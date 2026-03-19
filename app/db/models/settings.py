import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import EmailStatus, EmailTemplateType, FileStatus, FileStorageProvider, NotificationType
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class OrganizationPreferences(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "organization_preferences"
    __table_args__ = (UniqueConstraint("organization_id", name="uq_org_preferences_org"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    default_locale: Mapped[str] = mapped_column(String(20), nullable=False, default="en_US")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    date_format: Mapped[str] = mapped_column(String(20), nullable=False, default="YYYY-MM-DD")
    number_format: Mapped[str] = mapped_column(String(20), nullable=False, default="1,234.56")
    week_start_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    default_document_language: Mapped[str | None] = mapped_column(String(20), nullable=True)


class BrandingSettings(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "branding_settings"
    __table_args__ = (UniqueConstraint("organization_id", name="uq_branding_settings_org"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    brand_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    legal_footer: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_file_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("stored_files.id"), nullable=True)
    primary_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    secondary_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    email_header_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_footer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    invoice_terms_default: Mapped[str | None] = mapped_column(Text, nullable=True)
    bill_terms_default: Mapped[str | None] = mapped_column(Text, nullable=True)
    quote_terms_default: Mapped[str | None] = mapped_column(Text, nullable=True)


class NumberingSettings(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "numbering_settings"
    __table_args__ = (UniqueConstraint("organization_id", name="uq_numbering_settings_org"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    invoice_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="INV")
    credit_note_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="CRN")
    payment_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="PAY")
    bill_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="BIL")
    supplier_credit_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="SCN")
    supplier_payment_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="SPY")
    journal_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="JNL")
    quote_prefix: Mapped[str | None] = mapped_column(String(20), nullable=True)
    purchase_order_prefix: Mapped[str | None] = mapped_column(String(20), nullable=True)
    next_invoice_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    next_credit_note_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    next_payment_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    next_bill_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    next_supplier_credit_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    next_supplier_payment_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    next_journal_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class OrganizationNotificationSettings(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "organization_notification_settings"
    __table_args__ = (UniqueConstraint("organization_id", name="uq_org_notification_settings_org"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    send_invoice_email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    send_payment_receipt_email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    send_bill_reminder_email_enabled: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    overdue_invoice_reminder_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    reconciliation_alerts_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    report_export_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class UserNotificationPreference(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "user_notification_preferences"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", name="uq_user_notification_preferences_org_user"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    email_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    in_app_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    invoice_events_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    payment_events_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    report_events_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    banking_events_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class StoredFile(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "stored_files"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    storage_provider: Mapped[FileStorageProvider] = mapped_column(Enum(FileStorageProvider, name="file_storage_provider"), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_extension: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    uploaded_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[FileStatus] = mapped_column(Enum(FileStatus, name="file_status"), nullable=False, default=FileStatus.ACTIVE)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class DocumentLink(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "document_links"
    __table_args__ = (UniqueConstraint("organization_id", "file_id", "entity_type", "entity_id", name="uq_document_link_exact"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stored_files.id"), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    linked_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    linked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)


class EmailTemplate(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "email_templates"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    template_type: Mapped[EmailTemplateType] = mapped_column(Enum(EmailTemplateType, name="email_template_type"), nullable=False, index=True)
    subject_template: Mapped[str] = mapped_column(String(500), nullable=False)
    body_template: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class EmailLog(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "email_logs"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    template_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("email_templates.id"), nullable=True, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    to_email: Mapped[str] = mapped_column(String(320), nullable=False)
    cc_emails: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    bcc_emails: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    rendered_body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[EmailStatus] = mapped_column(Enum(EmailStatus, name="email_status"), nullable=False, default=EmailStatus.QUEUED, index=True)
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sent_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class InAppNotification(Base, UUIDPKMixin):
    __tablename__ = "in_app_notifications"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    notification_type: Mapped[NotificationType] = mapped_column(Enum(NotificationType, name="notification_type"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
