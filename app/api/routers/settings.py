from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.enums import EmailTemplateType
from app.core.exceptions import not_found
from app.api.deps.rbac import require_permission
from app.db.session import get_db
from app.repositories.email_log_repository import EmailLogRepository
from app.schemas.settings import (
    BrandingSettingsResponse,
    BrandingSettingsUpdateRequest,
    DocumentLinkCreateRequest,
    DocumentLinkListResponse,
    DocumentLinkResponse,
    EmailLogListResponse,
    EmailLogResponse,
    EmailSendRequest,
    EmailTemplateCreateRequest,
    EmailTemplateListResponse,
    EmailTemplateResponse,
    EmailTemplateUpdateRequest,
    FileUploadResponse,
    NotificationListResponse,
    NotificationResponse,
    NumberingSettingsResponse,
    NumberingSettingsUpdateRequest,
    OrganizationNotificationSettingsResponse,
    OrganizationNotificationSettingsUpdateRequest,
    OrganizationPreferencesResponse,
    OrganizationPreferencesUpdateRequest,
    StoredFileListResponse,
    StoredFileResponse,
    UnreadCountResponse,
    UserNotificationPreferencesResponse,
    UserNotificationPreferencesUpdateRequest,
)
from app.services.branding_service import BrandingService
from app.services.document_link_service import DocumentLinkService
from app.services.email_send_service import EmailSendService
from app.services.email_template_service import EmailTemplateService
from app.services.file_service import FileService
from app.services.notification_preference_service import NotificationPreferenceService
from app.services.notification_service import NotificationService
from app.services.numbering_service import NumberingService
from app.services.preferences_service import PreferencesService

router = APIRouter(prefix="/organizations/{organization_id}", tags=["settings_documents_notifications"])


@router.get("/settings/preferences", response_model=OrganizationPreferencesResponse)
def get_preferences(organization_id: str, _=Depends(require_permission("settings.read")), db: Session = Depends(get_db)):
    return PreferencesService(db).get_or_create(organization_id)


@router.patch("/settings/preferences", response_model=OrganizationPreferencesResponse)
def patch_preferences(organization_id: str, payload: OrganizationPreferencesUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("settings.update")), db: Session = Depends(get_db)):
    return PreferencesService(db).update(organization_id, current_user.id, payload.model_dump(exclude_unset=True))


@router.get("/settings/branding", response_model=BrandingSettingsResponse)
def get_branding(organization_id: str, _=Depends(require_permission("branding.read")), db: Session = Depends(get_db)):
    return BrandingService(db).get_or_create(organization_id)


@router.patch("/settings/branding", response_model=BrandingSettingsResponse)
def patch_branding(organization_id: str, payload: BrandingSettingsUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("branding.update")), db: Session = Depends(get_db)):
    return BrandingService(db).update(organization_id, current_user.id, payload.model_dump(exclude_unset=True))


@router.get("/settings/numbering", response_model=NumberingSettingsResponse)
def get_numbering(organization_id: str, _=Depends(require_permission("numbering.read")), db: Session = Depends(get_db)):
    return NumberingService(db).get_or_create(organization_id)


@router.patch("/settings/numbering", response_model=NumberingSettingsResponse)
def patch_numbering(organization_id: str, payload: NumberingSettingsUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("numbering.update")), db: Session = Depends(get_db)):
    return NumberingService(db).update(organization_id, current_user.id, payload.model_dump(exclude_unset=True))


@router.get("/settings/notifications", response_model=OrganizationNotificationSettingsResponse)
def get_notification_settings(organization_id: str, _=Depends(require_permission("notification_settings.read")), db: Session = Depends(get_db)):
    return NotificationPreferenceService(db).get_or_create_org(organization_id)


@router.patch("/settings/notifications", response_model=OrganizationNotificationSettingsResponse)
def patch_notification_settings(organization_id: str, payload: OrganizationNotificationSettingsUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("notification_settings.update")), db: Session = Depends(get_db)):
    return NotificationPreferenceService(db).update_org(organization_id, current_user.id, payload.model_dump(exclude_unset=True))


@router.get("/users/me/notification-preferences", response_model=UserNotificationPreferencesResponse)
def get_my_notification_preferences(organization_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("notification_settings.read")), db: Session = Depends(get_db)):
    return NotificationPreferenceService(db).get_or_create_user(organization_id, current_user.id)


@router.patch("/users/me/notification-preferences", response_model=UserNotificationPreferencesResponse)
def patch_my_notification_preferences(organization_id: str, payload: UserNotificationPreferencesUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("notification_settings.update")), db: Session = Depends(get_db)):
    return NotificationPreferenceService(db).update_user(organization_id, current_user.id, payload.model_dump(exclude_unset=True))


@router.post("/files/upload", response_model=FileUploadResponse)
async def upload_file(organization_id: str, upload: UploadFile = File(...), current_user=Depends(get_current_user), _=Depends(require_permission("files.upload")), db: Session = Depends(get_db)):
    return FileUploadResponse(file=await FileService(db).upload(organization_id, current_user.id, upload))


@router.get("/files", response_model=StoredFileListResponse)
def list_files(organization_id: str, _=Depends(require_permission("files.read")), db: Session = Depends(get_db)):
    return StoredFileListResponse(items=FileService(db).list(organization_id))


@router.get("/files/{file_id}", response_model=StoredFileResponse)
def get_file(organization_id: str, file_id: str, _=Depends(require_permission("files.read")), db: Session = Depends(get_db)):
    return FileService(db).get(organization_id, file_id)


@router.get("/files/{file_id}/download")
def download_file(organization_id: str, file_id: str, _=Depends(require_permission("files.read")), db: Session = Depends(get_db)):
    return FileService(db).download(organization_id, file_id)


@router.delete("/files/{file_id}")
def delete_file(organization_id: str, file_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("files.delete")), db: Session = Depends(get_db)):
    FileService(db).soft_delete(organization_id, file_id, current_user.id)
    return {"message": "deleted"}


@router.post("/documents/links", response_model=DocumentLinkResponse)
def create_document_link(organization_id: str, payload: DocumentLinkCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("files.link")), db: Session = Depends(get_db)):
    return DocumentLinkService(db).create(organization_id, current_user.id, payload.model_dump())


@router.get("/documents/links", response_model=DocumentLinkListResponse)
def list_document_links(organization_id: str, file_id: UUID | None = None, entity_type: str | None = None, entity_id: str | None = None, _=Depends(require_permission("files.read")), db: Session = Depends(get_db)):
    return DocumentLinkListResponse(items=DocumentLinkService(db).list(organization_id, file_id=file_id, entity_type=entity_type, entity_id=entity_id))


@router.delete("/documents/links/{link_id}")
def delete_document_link(organization_id: str, link_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("files.unlink")), db: Session = Depends(get_db)):
    DocumentLinkService(db).delete(organization_id, link_id, current_user.id)
    return {"message": "deleted"}


@router.get("/documents/entity/{entity_type}/{entity_id}", response_model=DocumentLinkListResponse)
def list_document_links_for_entity(organization_id: str, entity_type: str, entity_id: str, _=Depends(require_permission("files.read")), db: Session = Depends(get_db)):
    return DocumentLinkListResponse(items=DocumentLinkService(db).list(organization_id, entity_type=entity_type, entity_id=entity_id))


@router.post("/email-templates", response_model=EmailTemplateResponse)
def create_email_template(organization_id: str, payload: EmailTemplateCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("email_templates.create")), db: Session = Depends(get_db)):
    return EmailTemplateService(db).create(organization_id, current_user.id, payload.model_dump())


@router.get("/email-templates", response_model=EmailTemplateListResponse)
def list_email_templates(organization_id: str, template_type: EmailTemplateType | None = Query(None), _=Depends(require_permission("email_templates.read")), db: Session = Depends(get_db)):
    return EmailTemplateListResponse(items=EmailTemplateService(db).list(organization_id, template_type=template_type))


@router.get("/email-templates/{template_id}", response_model=EmailTemplateResponse)
def get_email_template(organization_id: str, template_id: str, _=Depends(require_permission("email_templates.read")), db: Session = Depends(get_db)):
    return EmailTemplateService(db).get(organization_id, template_id)


@router.patch("/email-templates/{template_id}", response_model=EmailTemplateResponse)
def patch_email_template(organization_id: str, template_id: str, payload: EmailTemplateUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("email_templates.update")), db: Session = Depends(get_db)):
    return EmailTemplateService(db).update(organization_id, template_id, current_user.id, payload.model_dump(exclude_unset=True))


@router.delete("/email-templates/{template_id}")
def delete_email_template(organization_id: str, template_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("email_templates.update")), db: Session = Depends(get_db)):
    EmailTemplateService(db).delete(organization_id, template_id, current_user.id)
    return {"message": "deleted"}


@router.post("/emails/send", response_model=EmailLogResponse)
def send_email(organization_id: str, payload: EmailSendRequest, current_user=Depends(get_current_user), _=Depends(require_permission("emails.send")), db: Session = Depends(get_db)):
    return EmailSendService(db).send(organization_id, current_user.id, payload.model_dump(exclude_unset=True))


@router.get("/emails", response_model=EmailLogListResponse)
def list_emails(organization_id: str, entity_type: str | None = None, entity_id: str | None = None, _=Depends(require_permission("emails.read")), db: Session = Depends(get_db)):
    return EmailLogListResponse(items=EmailLogRepository(db).list(organization_id, entity_type=entity_type, entity_id=entity_id))


@router.get("/emails/{email_log_id}", response_model=EmailLogResponse)
def get_email(organization_id: str, email_log_id: str, _=Depends(require_permission("emails.read")), db: Session = Depends(get_db)):
    row = EmailSendService(db).logs.get(organization_id, email_log_id)
    if not row:
        raise not_found("Email log not found")
    return row


@router.post("/invoices/{invoice_id}/send-email", response_model=EmailLogResponse)
def send_invoice_email(organization_id: str, invoice_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("emails.send")), db: Session = Depends(get_db)):
    return EmailSendService(db).send_invoice_email(organization_id, invoice_id, current_user.id)


@router.get("/notifications", response_model=NotificationListResponse)
def list_notifications(organization_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("notifications.read")), db: Session = Depends(get_db)):
    return NotificationListResponse(items=NotificationService(db).list_for_user(organization_id, current_user.id))


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
def unread_notification_count(organization_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("notifications.read")), db: Session = Depends(get_db)):
    return UnreadCountResponse(unread_count=NotificationService(db).unread_count(organization_id, current_user.id))


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
def read_notification(organization_id: str, notification_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("notifications.update")), db: Session = Depends(get_db)):
    return NotificationService(db).mark_read(organization_id, current_user.id, notification_id)


@router.post("/notifications/read-all")
def read_all_notifications(organization_id: str, current_user=Depends(get_current_user), _=Depends(require_permission("notifications.update")), db: Session = Depends(get_db)):
    count = NotificationService(db).mark_all_read(organization_id, current_user.id)
    return {"updated": count}
