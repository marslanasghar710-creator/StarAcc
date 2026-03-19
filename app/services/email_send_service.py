from __future__ import annotations

from datetime import datetime, timezone
import logging
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.enums import EmailStatus, EmailTemplateType, InvoiceStatus, NotificationType
from app.core.exceptions import forbidden, not_found
from app.db.models import Invoice
from app.repositories.audit import AuditRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.orgs import OrganizationRepository
from app.repositories.email_log_repository import EmailLogRepository
from app.repositories.email_template_repository import EmailTemplateRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.services.email_render_service import EmailRenderService
from app.services.notification_preference_service import NotificationPreferenceService
from app.services.notification_service import NotificationService

UTC = timezone.utc
logger = logging.getLogger(__name__)


class LoggingEmailProvider:
    def send(self, *, to_email: str, subject: str, body: str, cc_emails: list[str] | None = None, bcc_emails: list[str] | None = None) -> str:
        if to_email.endswith("@fail.test"):
            raise RuntimeError("Simulated provider failure")
        logger.info("Sending email to %s subject=%s cc=%s bcc=%s body=%s", to_email, subject, cc_emails or [], bcc_emails or [], body)
        return f"log-{uuid.uuid4()}"


class EmailSendService:
    def __init__(self, db: Session, provider: LoggingEmailProvider | None = None):
        self.db = db
        self.logs = EmailLogRepository(db)
        self.templates = EmailTemplateRepository(db)
        self.audit = AuditRepository(db)
        self.renderer = EmailRenderService()
        self.provider = provider or LoggingEmailProvider()
        self.invoices = InvoiceRepository(db)
        self.customers = CustomerRepository(db)
        self.orgs = OrganizationRepository(db)
        self.notifications = NotificationService(db)
        self.notification_preferences = NotificationPreferenceService(db)

    def send(self, organization_id: str, actor_user_id: str, payload: dict):
        if not payload.get("to_email"):
            raise HTTPException(status_code=400, detail="to_email is required")
        subject_template, body_template, template_id = self._resolve_template(organization_id, payload)
        variables = payload.get("merge_variables") or {}
        subject = self.renderer.render(subject_template, variables) if "{{" in subject_template else subject_template
        body = self.renderer.render(body_template, variables) if "{{" in body_template else body_template
        log = self.logs.create(
            organization_id=organization_id,
            template_id=template_id,
            entity_type=payload.get("entity_type"),
            entity_id=str(payload["entity_id"]) if payload.get("entity_id") else None,
            to_email=payload["to_email"],
            cc_emails=payload.get("cc_emails"),
            bcc_emails=payload.get("bcc_emails"),
            subject=subject,
            rendered_body=body,
            status=EmailStatus.QUEUED,
            sent_by_user_id=actor_user_id,
        )
        try:
            message_id = self.provider.send(
                to_email=payload["to_email"],
                subject=subject,
                body=body,
                cc_emails=payload.get("cc_emails"),
                bcc_emails=payload.get("bcc_emails"),
            )
            log.status = EmailStatus.SENT
            log.provider_message_id = message_id
            log.sent_at = datetime.now(UTC)
            self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="email.sent", entity_type="email_log", entity_id=str(log.id))
            self.db.commit()
            self.db.refresh(log)
            return log
        except Exception as exc:
            log.status = EmailStatus.FAILED
            log.error_message = str(exc)
            self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="email.failed", entity_type="email_log", entity_id=str(log.id))
            self.db.commit()
            self.db.refresh(log)
            raise HTTPException(status_code=502, detail="Email provider failed") from exc

    def send_invoice_email(self, organization_id: str, invoice_id: str, actor_user_id: str):
        invoice = self.invoices.get(organization_id, invoice_id)
        if not invoice:
            raise not_found("Invoice not found")
        if invoice.status not in {InvoiceStatus.APPROVED, InvoiceStatus.SENT}:
            raise forbidden("Invoice must be approved before sending")
        customer = self.customers.get(organization_id, invoice.customer_id)
        if not customer or not customer.email:
            raise forbidden("Customer email is required")
        if not self.notification_preferences.get_or_create_org(organization_id).send_invoice_email_enabled:
            raise forbidden("Invoice email sending is disabled for this organization")
        template = self.templates.get_active_by_type(organization_id, EmailTemplateType.INVOICE_SEND)
        organization = self.orgs.get(organization_id)
        subject_template = template.subject_template if template else "Invoice {{ invoice_number }} from {{ organization_name }}"
        body_template = template.body_template if template else "Hello {{ customer_name }},\n\nInvoice {{ invoice_number }} is ready. Amount due: {{ amount_due }}."
        log = self.send(
            organization_id,
            actor_user_id,
            {
                "template_id": str(template.id) if template else None,
                "entity_type": "invoice",
                "entity_id": str(invoice.id),
                "to_email": customer.email,
                "subject": subject_template,
                "body": body_template,
                "merge_variables": {
                    "organization_name": organization.name if organization else organization_id,
                    "customer_name": customer.display_name,
                    "invoice_number": invoice.invoice_number,
                    "due_date": invoice.due_date,
                    "amount_due": invoice.amount_due,
                },
            },
        )
        if log.status == EmailStatus.SENT and invoice.sent_at is None:
            invoice.sent_at = log.sent_at
            invoice.status = InvoiceStatus.SENT
            self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="invoice.sent", entity_type="invoice", entity_id=str(invoice.id))
            self.notifications.maybe_create_event(
                organization_id,
                actor_user_id,
                user_id=actor_user_id,
                event_category="invoice",
                notification_type=NotificationType.INVOICE_SENT,
                title="Invoice email sent",
                message=f"Invoice {invoice.invoice_number} was emailed to {customer.display_name}.",
                entity_type="invoice",
                entity_id=str(invoice.id),
            )
            self.db.commit()
            self.db.refresh(invoice)
        return log

    def _resolve_template(self, organization_id: str, payload: dict):
        template_id = payload.get("template_id")
        if template_id:
            template = self.templates.get(organization_id, template_id)
            if not template:
                raise not_found("Email template not found")
            return template.subject_template, template.body_template, template.id
        template_type = payload.get("template_type")
        if template_type:
            template = self.templates.get_active_by_type(organization_id, template_type)
            if not template:
                raise not_found("Active template not found")
            return template.subject_template, template.body_template, template.id
        if payload.get("subject") and payload.get("body"):
            return payload["subject"], payload["body"], None
        raise HTTPException(status_code=400, detail="Either template or subject/body must be provided")
