from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import User, UserProfile


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower(), User.deleted_at.is_(None)))

    def get_by_id(self, user_id):
        return self.db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))

    def create(self, email: str, password_hash: str) -> User:
        user = User(email=email.lower(), password_hash=password_hash)
        self.db.add(user)
        self.db.flush()
        self.db.add(UserProfile(user_id=user.id))
        self.db.flush()
        return user
