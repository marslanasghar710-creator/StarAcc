from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import FileStatus, FileStorageProvider
from app.core.exceptions import forbidden, not_found
from app.repositories.audit import AuditRepository
from app.repositories.file_repository import FileRepository
from app.services.file_storage_service import LocalFileStorageService

UTC = timezone.utc


class FileService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = FileRepository(db)
        self.audit = AuditRepository(db)
        self.storage = LocalFileStorageService()
        self.allowed_mime_types = {item.strip() for item in settings.file_upload_allowed_mime_types.split(",") if item.strip()}

    async def upload(self, organization_id: str, actor_user_id: str, upload: UploadFile, *, is_public: bool = False, metadata_json: dict | None = None):
        content = await upload.read()
        if not content:
            raise forbidden("Uploaded file cannot be empty")
        if len(content) > settings.file_upload_max_bytes:
            raise forbidden("Uploaded file exceeds maximum size")
        if upload.content_type not in self.allowed_mime_types:
            raise forbidden("Unsupported file type")
        storage_path, checksum = self.storage.save(organization_id=organization_id, original_file_name=upload.filename or "upload.bin", content=content)
        row = self.repo.create(
            organization_id=organization_id,
            storage_provider=FileStorageProvider.LOCAL,
            storage_path=storage_path,
            original_file_name=upload.filename or Path(storage_path).name,
            file_extension=Path(upload.filename or storage_path).suffix.lstrip(".") or None,
            mime_type=upload.content_type,
            file_size_bytes=len(content),
            checksum_sha256=checksum,
            uploaded_by_user_id=actor_user_id,
            uploaded_at=datetime.now(UTC),
            is_public=is_public,
            status=FileStatus.ACTIVE,
            metadata_json=metadata_json,
        )
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="file.uploaded", entity_type="stored_file", entity_id=str(row.id))
        self.db.commit()
        self.db.refresh(row)
        return row

    def get(self, organization_id: str, file_id: str):
        row = self.repo.get(organization_id, file_id)
        if not row:
            raise not_found("File not found")
        return row

    def list(self, organization_id: str):
        return self.repo.list(organization_id)

    def download(self, organization_id: str, file_id: str):
        row = self.get(organization_id, file_id)
        full_path = self.storage.resolve_path(row.storage_path)
        if not self.storage.exists(row.storage_path):
            raise not_found("File content not found")
        return FileResponse(path=full_path, media_type=row.mime_type, filename=row.original_file_name)

    def soft_delete(self, organization_id: str, file_id: str, actor_user_id: str):
        row = self.get(organization_id, file_id)
        row.status = FileStatus.DELETED
        row.deleted_at = datetime.now(UTC)
        self.audit.create(organization_id=organization_id, actor_user_id=actor_user_id, action="file.deleted", entity_type="stored_file", entity_id=str(row.id))
        self.db.commit()
        return row
