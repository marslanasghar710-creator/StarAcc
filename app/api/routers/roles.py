from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.repositories.rbac import RBACRepository
from app.schemas.rbac import PermissionResponse, RoleResponse

router = APIRouter()


@router.get("/roles", response_model=list[RoleResponse])
def roles(_=Depends(get_current_user), db: Session = Depends(get_db)):
    return RBACRepository(db).get_roles()


@router.get("/permissions", response_model=list[PermissionResponse])
def permissions(_=Depends(get_current_user), db: Session = Depends(get_db)):
    return RBACRepository(db).get_permissions()
