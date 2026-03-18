import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from scripts.seed_rbac import main as seed_rbac

TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/staracc_test")


@pytest.fixture(scope="session")
def engine():
    engine = create_engine(TEST_DB_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db(engine):
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(autouse=True)
def _seed(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_DB_URL)
    seed_rbac()


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
