from datetime import datetime, timezone

UTC = timezone.utc
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import CreditNoteStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.credit_note_repository import CreditNoteRepository
from app.services.credit_note_calculation_service import CreditNoteCalculationService
from app.services.credit_note_posting_service import CreditNotePostingService


class CreditNoteService:
    def __init__(self, db: Session):
        self.db = db
        self.credit_notes = CreditNoteRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, actor_user_id, payload):
        number = self.credit_notes.next_number(organization_id)
        note = self.credit_notes.create(
            organization_id=organization_id,
            customer_id=payload["customer_id"],
            credit_note_number=number,
            issue_date=payload["issue_date"],
            currency_code=payload["currency_code"],
            related_invoice_id=payload.get("related_invoice_id"),
            reason=payload.get("reason"),
            created_by_user_id=actor_user_id,
        )
        for i, item in enumerate(payload.get("items", []), start=1):
            subtotal, tax, total = CreditNoteCalculationService.calculate_line(item["quantity"], item["unit_price"], item.get("line_tax_amount", 0))
            self.credit_notes.create_item(
                credit_note_id=note.id,
                organization_id=organization_id,
                line_number=i,
                description=item["description"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                account_id=item["account_id"],
                tax_code_id=None,
                line_subtotal=subtotal,
                line_tax_amount=tax,
                line_total=total,
            )
        self._recalc(note)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="credit_note.created", entity_type="credit_note", entity_id=str(note.id))
        self.db.commit()
        return note

    def _recalc(self, note):
        items = self.credit_notes.list_items(note.id)
        subtotal, tax, total = CreditNoteCalculationService.calculate_header(items)
        note.subtotal_amount = subtotal
        note.tax_amount = tax
        note.total_amount = total
        if note.status in {CreditNoteStatus.DRAFT, CreditNoteStatus.APPROVED}:
            note.unapplied_amount = total

    def approve(self, organization_id, credit_note_id, actor_user_id):
        note = self.credit_notes.get(organization_id, credit_note_id)
        if not note:
            raise not_found("Credit note not found")
        if note.status != CreditNoteStatus.DRAFT:
            raise forbidden("Only draft can be approved")
        if len(self.credit_notes.list_items(note.id)) == 0:
            raise forbidden("Credit note needs at least one line")
        note.status = CreditNoteStatus.APPROVED
        note.approved_by_user_id = actor_user_id
        note.approved_at = datetime.now(UTC)
        self.db.commit()
        return note

    def post(self, organization_id, credit_note_id, actor_user_id):
        return CreditNotePostingService(self.db).post(organization_id, credit_note_id, actor_user_id)

    def apply(self, organization_id, credit_note_id, actor_user_id, invoice, amount):
        note = self.credit_notes.get(organization_id, credit_note_id)
        if not note:
            raise not_found("Credit note not found")
        if note.status not in {CreditNoteStatus.POSTED, CreditNoteStatus.APPLIED}:
            raise forbidden("Credit note must be posted")
        if Decimal(amount) > Decimal(note.unapplied_amount):
            raise forbidden("Cannot over-apply credit note")
        note.unapplied_amount = Decimal(note.unapplied_amount) - Decimal(amount)
        invoice.amount_due = max(Decimal("0"), Decimal(invoice.amount_due) - Decimal(amount))
        if invoice.amount_due == 0:
            invoice.status = "paid"
        note.status = CreditNoteStatus.APPLIED if note.unapplied_amount < note.total_amount else note.status
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="credit_note.applied", entity_type="credit_note", entity_id=str(note.id))
        self.db.commit()
        return note
