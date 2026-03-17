from fastapi import FastAPI

from app.api.routers import auth, organizations, invitations, roles, audit

app = FastAPI(title="StarAcc Foundation API")

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
app.include_router(invitations.router, prefix="/invitations", tags=["invitations"])
app.include_router(roles.router, tags=["rbac"])
app.include_router(audit.router, prefix="/organizations", tags=["audit"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
