from __future__ import annotations

import json
from typing import Any


def normalize_value(value: Any) -> str:
    if isinstance(value, dict):
        return json.dumps(value, default=str, sort_keys=True)
    if isinstance(value, list):
        return json.dumps(value, default=str)
    return "" if value is None else str(value)


def flatten_payload(payload: Any, prefix: str = "") -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    if isinstance(payload, list):
        for item in payload:
            rows.extend(flatten_payload(item, prefix=prefix))
        return rows

    if isinstance(payload, dict):
        base: dict[str, str] = {}
        nested_lists: list[tuple[str, list[Any]]] = []
        for key, value in payload.items():
            full_key = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"
            if isinstance(value, dict):
                nested = flatten_payload(value, prefix=full_key)
                if nested:
                    base.update(nested[0])
            elif isinstance(value, list):
                nested_lists.append((full_key, value))
            else:
                base[full_key] = normalize_value(value)

        if not nested_lists:
            return [base]

        for list_key, items in nested_lists:
            if not items:
                rows.append(base | {list_key: "[]"})
            elif all(isinstance(item, dict) for item in items):
                for item in items:
                    for flattened in flatten_payload(item, prefix=list_key):
                        rows.append(base | flattened)
            else:
                rows.append(base | {list_key: normalize_value(items)})
        return rows or [base]

    return [{prefix or "value": normalize_value(payload)}]
