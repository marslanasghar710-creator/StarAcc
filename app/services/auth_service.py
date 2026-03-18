import secrets
from datetime import datetime, timezone

UTC = timezone.utc

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.enums import UserStatus
from app.core.exceptions import forbidden, unauthorized
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.repositories.audit import AuditRepository
from app.repositories.membership import MembershipRepository
from app.repositories.sessions import SessionRepository
from app.repositories.users import UserRepository


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.sessions = SessionRepository(db)
        self.memberships = MembershipRepository(db)
        self.audit = AuditRepository(db)

    def register(self, email: str, password: str):
        if self.users.get_by_email(email):
            raise forbidden("Email already registered")
        user = self.users.create(email=email.lower(), password_hash=hash_password(password))
        self.audit.create(actor_user_id=user.id, action="user.registered", entity_type="user", entity_id=str(user.id))
        self.db.commit()
        return user

    def login(self, email: str, password: str, request: Request):
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise unauthorized("Invalid credentials")
        if user.status != UserStatus.ACTIVE:
            raise forbidden("Account is not active")
        access = create_access_token(str(user.id))
        refresh, jti, exp = create_refresh_token(str(user.id))
        self.sessions.create(
            user_id=user.id,
            refresh_token_jti=jti,
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host if request.client else None,
            expires_at=exp,
            last_used_at=datetime.now(UTC),
        )
        self.audit.create(actor_user_id=user.id, action="user.logged_in", entity_type="session", entity_id=jti)
        self.db.commit()
        return access, refresh

    def refresh(self, refresh_token: str):
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise unauthorized("Invalid token type")
        jti = payload["jti"]
        session = self.sessions.get_by_jti(jti)
        if not session or session.revoked_at is not None or session.expires_at < datetime.now(UTC):
            raise unauthorized("Refresh session invalid")
        self.sessions.revoke(session)
        access = create_access_token(payload["sub"])
        new_refresh, new_jti, exp = create_refresh_token(payload["sub"])
        self.sessions.create(
            user_id=session.user_id,
            refresh_token_jti=new_jti,
            user_agent=session.user_agent,
            ip_address=session.ip_address,
            expires_at=exp,
            last_used_at=datetime.now(UTC),
        )
        self.db.commit()
        return access, new_refresh

    def logout(self, refresh_token: str, actor_user_id):
        payload = decode_token(refresh_token)
        session = self.sessions.get_by_jti(payload.get("jti"))
        if session:
            self.sessions.revoke(session)
            self.audit.create(actor_user_id=actor_user_id, action="user.logged_out", entity_type="session", entity_id=str(session.id))
            self.db.commit()

    def forgot_password(self, email: str):
        return {"reset_token": secrets.token_urlsafe(32)}

    def reset_password(self, token: str, new_password: str):
        _ = token
        return {"message": "TODO: implement reset token persistence"}
