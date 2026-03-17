from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.schemas.membership import InvitationAcceptRequest, InvitationDeclineRequest
from app.services.membership_service import MembershipService

router = APIRouter()


@router.post("/accept")
def accept(payload: InvitationAcceptRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    MembershipService(db).accept_invitation(payload.token, current_user.id)
    return {"message": "accepted"}


@router.post("/decline")
def decline(payload: InvitationDeclineRequest, db: Session = Depends(get_db)):
    MembershipService(db).decline_invitation(payload.token)
    return {"message": "declined"}
