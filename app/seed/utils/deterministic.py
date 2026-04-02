from __future__ import annotations

import hashlib
from random import Random


def deterministic_rng(seed_key: str) -> Random:
    digest = hashlib.sha256(seed_key.encode("utf-8")).hexdigest()
    return Random(int(digest[:16], 16))


def stable_suffix(seed_key: str, index: int) -> str:
    digest = hashlib.sha256(f"{seed_key}:{index}".encode("utf-8")).hexdigest()
    return digest[:8]
