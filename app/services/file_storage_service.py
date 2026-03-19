from __future__ import annotations

import hashlib
import os
import uuid
from pathlib import Path

from app.core.config import settings


class LocalFileStorageService:
    provider_name = "local"

    def __init__(self, root: str | None = None):
        self.root = Path(root or settings.file_storage_root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, *, organization_id: str, original_file_name: str, content: bytes) -> tuple[str, str]:
        suffix = Path(original_file_name).suffix.lower()
        relative_path = Path(str(organization_id)) / f"{uuid.uuid4().hex}{suffix}"
        full_path = self.root / relative_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(content)
        checksum = hashlib.sha256(content).hexdigest()
        return str(relative_path), checksum

    def resolve_path(self, storage_path: str) -> str:
        return str(self.root / storage_path)

    def open_bytes(self, storage_path: str) -> bytes:
        return Path(self.resolve_path(storage_path)).read_bytes()

    def exists(self, storage_path: str) -> bool:
        return os.path.exists(self.resolve_path(storage_path))
