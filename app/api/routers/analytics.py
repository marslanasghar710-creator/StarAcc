from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.analytics import FunnelEventRequest, FunnelEventResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/events", response_model=FunnelEventResponse)
def track_event(payload: FunnelEventRequest, db: Session = Depends(get_db)):
    return AnalyticsService(db).track_funnel_event(payload)
