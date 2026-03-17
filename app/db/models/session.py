import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPKMixin


class Session(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    refresh_token_jti: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(nullable=True)
