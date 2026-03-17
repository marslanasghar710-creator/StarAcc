import uuid
from datetime import datetime, timedelta, UTC

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    expires = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": subject, "type": "access", "exp": expires}, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(subject: str, jti: str | None = None) -> tuple[str, str, datetime]:
    jti = jti or str(uuid.uuid4())
    expires = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    token = jwt.encode(
        {"sub": subject, "jti": jti, "type": "refresh", "exp": expires},
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    return token, jti, expires


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
