import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routers import auth, organizations, invitations, roles, audit, accounting, ar, ap, banking, reporting, tax, settings as settings_router, inventory, projects, payroll, ai, consolidation, onboarding, billing, integrations
from app.core.config import settings
from app.db.session import engine
from app.middleware.request_context import RequestContextMiddleware

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="StarAcc Foundation API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestContextMiddleware)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
app.include_router(invitations.router, prefix="/invitations", tags=["invitations"])
app.include_router(roles.router, tags=["rbac"])
app.include_router(audit.router, prefix="/organizations", tags=["audit"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, str]:
    with engine.connect() as connection:
        connection.execute(text("select 1"))
    return {"status": "ok", "database": "ok"}


app.include_router(accounting.router)
app.include_router(ar.router)
app.include_router(ap.router)
app.include_router(banking.router)
app.include_router(reporting.router)
app.include_router(tax.router)
app.include_router(settings_router.router)
app.include_router(inventory.router)
app.include_router(projects.router)
app.include_router(payroll.router)
app.include_router(ai.router)
app.include_router(consolidation.router)

app.include_router(onboarding.router)
app.include_router(billing.router)
app.include_router(integrations.router)
