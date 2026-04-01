from __future__ import annotations

import re
from datetime import datetime, timezone

UTC = timezone.utc


def sanitize_segment(value: str) -> str:
    lowered = value.strip().lower()
    lowered = re.sub(r"[^a-z0-9\-_.]+", "-", lowered)
    lowered = re.sub(r"-+", "-", lowered).strip("-")
    return lowered or "export"


def build_filename(*, stem: str, extension: str, at: datetime | None = None) -> str:
    at = at or datetime.now(UTC)
    ts = at.strftime("%Y%m%dT%H%M%SZ")
    safe_stem = sanitize_segment(stem)
    return f"{safe_stem}-{ts}.{extension}"
