from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import unauthorized
from app.core.security import decode_token
from app.db.session import get_db
from app.repositories.users import UserRepository

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: Session = Depends(get_db)
):
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise unauthorized("Invalid access token")
    user = UserRepository(db).get_by_id(payload.get("sub"))
    if not user:
        raise unauthorized("User not found")
    return user
