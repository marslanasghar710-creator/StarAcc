from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.repositories.membership import MembershipRepository
from app.repositories.sessions import SessionRepository
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    PasswordForgotRequest,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    SessionsResponse,
    TokenResponse,
    UserOrgSummary,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    return AuthService(db).register(payload.email, payload.password)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    access, refresh = AuthService(db).login(payload.email, payload.password, request)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    access, refresh_token = AuthService(db).refresh(payload.refresh_token)
    return TokenResponse(access_token=access, refresh_token=refresh_token)


@router.post("/logout")
def logout(payload: RefreshRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    AuthService(db).logout(payload.refresh_token, current_user.id)
    return {"message": "Logged out"}


@router.post("/password/forgot")
def forgot(payload: PasswordForgotRequest, db: Session = Depends(get_db)):
    return AuthService(db).forgot_password(payload.email)


@router.post("/password/reset")
def reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    return AuthService(db).reset_password(payload.token, payload.new_password)


@router.get("/me", response_model=MeResponse)
def me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = MembershipRepository(db).list_for_user(current_user.id)
    return MeResponse(
        user=UserResponse.model_validate(current_user),
        organizations=[UserOrgSummary(organization_id=m.organization_id, role=str(m.role_id)) for m in memberships],
    )


@router.get("/sessions", response_model=SessionsResponse)
def list_sessions(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return SessionsResponse(sessions=SessionRepository(db).list_for_user(current_user.id))


@router.delete("/sessions/{session_id}")
def revoke_session(session_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    sessions_repo = SessionRepository(db)
    for s in sessions_repo.list_for_user(current_user.id):
        if str(s.id) == session_id:
            sessions_repo.revoke(s)
            db.commit()
            return {"message": "Session revoked"}
    return {"message": "No action"}
