from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.enums import EmailStatus, EmailTemplateType, FileStatus, FileStorageProvider, NotificationType
from app.schemas.common import ORMModel


class SafeORMModel(ORMModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class OrganizationPreferencesResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    default_locale: str
    timezone: str
    date_format: str
    number_format: str
    week_start_day: int | None
    default_document_language: str | None
    created_at: datetime
    updated_at: datetime


class OrganizationPreferencesUpdateRequest(BaseModel):
    default_locale: str | None = None
    timezone: str | None = None
    date_format: str | None = None
    number_format: str | None = None
    week_start_day: int | None = Field(default=None, ge=0, le=6)
    default_document_language: str | None = None


class BrandingSettingsResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    brand_name: str | None
    legal_footer: str | None
    logo_file_id: UUID | None
    primary_color: str | None
    secondary_color: str | None
    email_header_text: str | None
    email_footer_text: str | None
    invoice_terms_default: str | None
    bill_terms_default: str | None
    quote_terms_default: str | None
    created_at: datetime
    updated_at: datetime


class BrandingSettingsUpdateRequest(BaseModel):
    brand_name: str | None = None
    legal_footer: str | None = None
    logo_file_id: UUID | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    email_header_text: str | None = None
    email_footer_text: str | None = None
    invoice_terms_default: str | None = None
    bill_terms_default: str | None = None
    quote_terms_default: str | None = None


class NumberingSettingsResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    invoice_prefix: str
    credit_note_prefix: str
    payment_prefix: str
    bill_prefix: str
    supplier_credit_prefix: str
    supplier_payment_prefix: str
    journal_prefix: str
    quote_prefix: str | None
    purchase_order_prefix: str | None
    next_invoice_number: int
    next_credit_note_number: int
    next_payment_number: int
    next_bill_number: int
    next_supplier_credit_number: int
    next_supplier_payment_number: int
    next_journal_number: int
    created_at: datetime
    updated_at: datetime


class NumberingSettingsUpdateRequest(BaseModel):
    invoice_prefix: str | None = None
    credit_note_prefix: str | None = None
    payment_prefix: str | None = None
    bill_prefix: str | None = None
    supplier_credit_prefix: str | None = None
    supplier_payment_prefix: str | None = None
    journal_prefix: str | None = None
    quote_prefix: str | None = None
    purchase_order_prefix: str | None = None
    next_invoice_number: int | None = Field(default=None, ge=1)
    next_credit_note_number: int | None = Field(default=None, ge=1)
    next_payment_number: int | None = Field(default=None, ge=1)
    next_bill_number: int | None = Field(default=None, ge=1)
    next_supplier_credit_number: int | None = Field(default=None, ge=1)
    next_supplier_payment_number: int | None = Field(default=None, ge=1)
    next_journal_number: int | None = Field(default=None, ge=1)


class OrganizationNotificationSettingsResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    send_invoice_email_enabled: bool
    send_payment_receipt_email_enabled: bool
    send_bill_reminder_email_enabled: bool | None
    overdue_invoice_reminder_enabled: bool
    reconciliation_alerts_enabled: bool
    report_export_notifications_enabled: bool
    created_at: datetime
    updated_at: datetime


class OrganizationNotificationSettingsUpdateRequest(BaseModel):
    send_invoice_email_enabled: bool | None = None
    send_payment_receipt_email_enabled: bool | None = None
    send_bill_reminder_email_enabled: bool | None = None
    overdue_invoice_reminder_enabled: bool | None = None
    reconciliation_alerts_enabled: bool | None = None
    report_export_notifications_enabled: bool | None = None


class UserNotificationPreferencesResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    user_id: UUID
    email_notifications_enabled: bool
    in_app_notifications_enabled: bool
    invoice_events_enabled: bool
    payment_events_enabled: bool
    report_events_enabled: bool
    banking_events_enabled: bool
    created_at: datetime
    updated_at: datetime


class UserNotificationPreferencesUpdateRequest(BaseModel):
    email_notifications_enabled: bool | None = None
    in_app_notifications_enabled: bool | None = None
    invoice_events_enabled: bool | None = None
    payment_events_enabled: bool | None = None
    report_events_enabled: bool | None = None
    banking_events_enabled: bool | None = None


class StoredFileResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    storage_provider: FileStorageProvider
    original_file_name: str
    file_extension: str | None
    mime_type: str
    file_size_bytes: int
    checksum_sha256: str | None
    uploaded_by_user_id: UUID
    uploaded_at: datetime
    is_public: bool
    status: FileStatus
    metadata_json: dict | None
    deleted_at: datetime | None


class FileUploadResponse(BaseModel):
    file: StoredFileResponse


class StoredFileListResponse(BaseModel):
    items: list[StoredFileResponse]


class DocumentLinkCreateRequest(BaseModel):
    file_id: UUID
    entity_type: str
    entity_id: UUID | str
    label: str | None = None


class DocumentLinkResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    file_id: UUID
    entity_type: str
    entity_id: str
    linked_by_user_id: UUID
    linked_at: datetime
    label: str | None
    created_at: datetime


class DocumentLinkListResponse(BaseModel):
    items: list[DocumentLinkResponse]


class EmailTemplateCreateRequest(BaseModel):
    template_type: EmailTemplateType
    subject_template: str
    body_template: str
    is_active: bool = True


class EmailTemplateUpdateRequest(BaseModel):
    template_type: EmailTemplateType | None = None
    subject_template: str | None = None
    body_template: str | None = None
    is_active: bool | None = None


class EmailTemplateResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    template_type: EmailTemplateType
    subject_template: str
    body_template: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class EmailTemplateListResponse(BaseModel):
    items: list[EmailTemplateResponse]


class EmailSendRequest(BaseModel):
    template_id: UUID | None = None
    template_type: EmailTemplateType | None = None
    to_email: EmailStr
    cc_emails: list[EmailStr] | None = None
    bcc_emails: list[EmailStr] | None = None
    subject: str | None = None
    body: str | None = None
    entity_type: str | None = None
    entity_id: UUID | str | None = None
    merge_variables: dict[str, object] = Field(default_factory=dict)


class EmailLogResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    template_id: UUID | None
    entity_type: str | None
    entity_id: str | None
    to_email: EmailStr
    cc_emails: list[EmailStr] | None
    bcc_emails: list[EmailStr] | None
    subject: str
    rendered_body: str
    status: EmailStatus
    provider_message_id: str | None
    sent_by_user_id: UUID | None
    sent_at: datetime | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class EmailLogListResponse(BaseModel):
    items: list[EmailLogResponse]


class NotificationResponse(SafeORMModel):
    id: UUID
    organization_id: UUID
    user_id: UUID
    notification_type: NotificationType
    title: str
    message: str
    entity_type: str | None
    entity_id: str | None
    is_read: bool
    read_at: datetime | None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]


class UnreadCountResponse(BaseModel):
    unread_count: int
