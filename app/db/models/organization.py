import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import OrganizationStatus
from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class Organization(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tax_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    base_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    fiscal_year_start_month: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    fiscal_year_start_day: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    status: Mapped[OrganizationStatus] = mapped_column(
        Enum(OrganizationStatus, name="organization_status"), nullable=False, default=OrganizationStatus.ACTIVE
    )


class OrganizationSettings(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "organization_settings"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), unique=True, nullable=False)
    default_locale: Mapped[str] = mapped_column(String(20), nullable=False, default="en_US")
    date_format: Mapped[str] = mapped_column(String(20), nullable=False, default="YYYY-MM-DD")
    number_format: Mapped[str] = mapped_column(String(20), nullable=False, default="1,234.56")
    invoice_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="INV")
    bill_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="BILL")
    journal_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default="JNL")
    tax_enabled: Mapped[bool] = mapped_column(nullable=False, default=True)
    multi_currency_enabled: Mapped[bool] = mapped_column(nullable=False, default=False)
