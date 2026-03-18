from datetime import datetime, timezone

UTC = timezone.utc

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Session as UserSession


class SessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs) -> UserSession:
        s = UserSession(**kwargs)
        self.db.add(s)
        self.db.flush()
        return s

    def get_by_jti(self, jti: str):
        return self.db.scalar(select(UserSession).where(UserSession.refresh_token_jti == jti))

    def list_for_user(self, user_id):
        return list(self.db.scalars(select(UserSession).where(UserSession.user_id == user_id)).all())

    def revoke(self, session_obj: UserSession):
        session_obj.revoked_at = datetime.now(UTC)
        self.db.flush()
