from datetime import datetime, UTC
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import SupplierCreditStatus
from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.supplier_credit_repository import SupplierCreditRepository
from app.services.supplier_credit_calculation_service import SupplierCreditCalculationService
from app.services.supplier_credit_posting_service import SupplierCreditPostingService


class SupplierCreditService:
    def __init__(self, db: Session):
        self.db = db
        self.supplier_credits = SupplierCreditRepository(db)
        self.audit = AuditRepository(db)

    def create(self, organization_id, actor_user_id, payload):
        number = self.supplier_credits.next_number(organization_id)
        credit = self.supplier_credits.create(
            organization_id=organization_id,
            supplier_id=payload["supplier_id"],
            supplier_credit_number=number,
            issue_date=payload["issue_date"],
            currency_code=payload["currency_code"],
            related_bill_id=payload.get("related_bill_id"),
            reason=payload.get("reason"),
            created_by_user_id=actor_user_id,
        )
        for i, item in enumerate(payload.get("items", []), start=1):
            subtotal, tax, total = SupplierCreditCalculationService.calculate_line(item["quantity"], item["unit_price"], item.get("line_tax_amount", 0))
            self.supplier_credits.create_item(
                supplier_credit_id=credit.id,
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
        self._recalc(credit)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="supplier_credit.created", entity_type="supplier_credit", entity_id=str(credit.id))
        self.db.commit()
        return credit

    def _recalc(self, credit):
        items = self.supplier_credits.list_items(credit.id)
        subtotal, tax, total = SupplierCreditCalculationService.calculate_header(items)
        credit.subtotal_amount = subtotal
        credit.tax_amount = tax
        credit.total_amount = total
        if credit.status in {SupplierCreditStatus.DRAFT, SupplierCreditStatus.APPROVED}:
            credit.unapplied_amount = total

    def approve(self, organization_id, supplier_credit_id, actor_user_id):
        credit = self.supplier_credits.get(organization_id, supplier_credit_id)
        if not credit:
            raise not_found("Supplier credit not found")
        if credit.status != SupplierCreditStatus.DRAFT:
            raise forbidden("Only draft can be approved")
        if len(self.supplier_credits.list_items(credit.id)) == 0:
            raise forbidden("Supplier credit needs at least one line")
        credit.status = SupplierCreditStatus.APPROVED
        credit.approved_by_user_id = actor_user_id
        credit.approved_at = datetime.now(UTC)
        self.db.commit()
        return credit

    def post(self, organization_id, supplier_credit_id, actor_user_id):
        return SupplierCreditPostingService(self.db).post(organization_id, supplier_credit_id, actor_user_id)

    def apply(self, organization_id, supplier_credit_id, actor_user_id, bill, amount):
        credit = self.supplier_credits.get(organization_id, supplier_credit_id)
        if not credit:
            raise not_found("Supplier credit not found")
        if credit.status not in {SupplierCreditStatus.POSTED, SupplierCreditStatus.APPLIED}:
            raise forbidden("Supplier credit must be posted")
        if Decimal(amount) > Decimal(credit.unapplied_amount):
            raise forbidden("Cannot over-apply supplier credit")
        credit.unapplied_amount = Decimal(credit.unapplied_amount) - Decimal(amount)
        bill.amount_due = max(Decimal("0"), Decimal(bill.amount_due) - Decimal(amount))
        if bill.amount_due == 0:
            bill.status = "paid"
        credit.status = SupplierCreditStatus.APPLIED if credit.unapplied_amount < credit.total_amount else credit.status
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="supplier_credit.applied", entity_type="supplier_credit", entity_id=str(credit.id))
        self.db.commit()
        return credit
