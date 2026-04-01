from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.core.enums import ReportExportFormat


@dataclass(slots=True)
class ExportRequest:
    organization_id: str
    export_type: str
    format: ReportExportFormat
    payload: Any
    file_stem: str
    actor_user_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ExportArtifact:
    content: bytes
    media_type: str
    extension: str
    generated_at: datetime
