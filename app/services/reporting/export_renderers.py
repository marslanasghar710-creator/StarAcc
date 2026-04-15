from __future__ import annotations

import io
import json
import re
import zipfile
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from xml.sax.saxutils import escape


def _normalize_scalar(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (dict, list)):
        return json.dumps(value, default=str, sort_keys=True)
    return str(value)


def flatten_payload(payload: Any, prefix: str = "") -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if isinstance(payload, list):
        for item in payload:
            rows.extend(flatten_payload(item, prefix=prefix))
        return rows
    if isinstance(payload, dict):
        base: dict[str, Any] = {}
        nested_lists: list[tuple[str, list[Any]]] = []
        for key in sorted(payload.keys()):
            value = payload[key]
            full_key = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"
            if isinstance(value, dict):
                nested_dict_rows = flatten_payload(value, prefix=full_key)
                if nested_dict_rows:
                    base.update(nested_dict_rows[0])
            elif isinstance(value, list):
                nested_lists.append((full_key, value))
            else:
                base[full_key] = _normalize_scalar(value)
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
                rows.append(base | {list_key: _normalize_scalar(items)})
        return rows or [base]
    return [{prefix or "value": _normalize_scalar(payload)}]


def _serialize_filter_summary(filters: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in sorted(filters.keys()):
        value = filters[key]
        if value in (None, "", [], {}):
            continue
        parts.append(f"{key}: {_normalize_scalar(value)}")
    return " | ".join(parts) if parts else "No filters"


def _build_pdf(lines: list[str]) -> bytes:
    escaped_lines = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for line in lines]
    y = 770
    content_lines = ["BT", "/F1 10 Tf", "50 790 Td"]
    for index, line in enumerate(escaped_lines):
        if index == 0:
            content_lines.append(f"({line}) Tj")
        else:
            y -= 14
            content_lines.append(f"1 0 0 1 50 {y} Tm ({line}) Tj")
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        f"5 0 obj\n<< /Length {len(stream)} >>\nstream\n".encode("latin-1") + stream + b"\nendstream\nendobj\n",
    ]

    output = io.BytesIO()
    output.write(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(output.tell())
        output.write(obj)
    xref_start = output.tell()
    output.write(f"xref\n0 {len(offsets)}\n".encode("latin-1"))
    output.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.write(f"{offset:010d} 00000 n \n".encode("latin-1"))
    output.write(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF".encode("latin-1"))
    return output.getvalue()


def render_report_pdf(*, title: str, payload: dict[str, Any]) -> bytes:
    metadata = payload.get("metadata", {}) if isinstance(payload, dict) else {}
    filters = payload.get("filters", {}) if isinstance(payload, dict) else {}
    rows = flatten_payload(payload)
    fieldnames = sorted({key for row in rows for key in row.keys()})

    lines = [
        title,
        f"Organization: {_normalize_scalar(metadata.get('organization_name') or metadata.get('organization_id') or 'Organization')}",
        f"Generated: {_normalize_scalar(metadata.get('generated_at') or datetime.utcnow().isoformat())}",
        f"Accounting basis: {_normalize_scalar(metadata.get('accounting_basis') or filters.get('accounting_basis') or 'accrual')}",
        f"Filters: {_serialize_filter_summary(filters if isinstance(filters, dict) else {})}",
        "",
        "Report data:",
    ]

    max_columns = min(8, len(fieldnames))
    selected_fields = fieldnames[:max_columns]
    if selected_fields:
        lines.append(" | ".join(selected_fields))
        lines.append("-" * 110)
        for row in rows[:45]:
            rendered = [str(_normalize_scalar(row.get(field, ""))) for field in selected_fields]
            lines.append(" | ".join(rendered)[:170])
    else:
        lines.append("No tabular rows available.")

    if isinstance(payload.get("totals"), dict) and payload["totals"]:
        lines.append("")
        lines.append("Totals:")
        for key in sorted(payload["totals"].keys()):
            lines.append(f"{key}: {_normalize_scalar(payload['totals'][key])}")

    if len(fieldnames) > max_columns:
        lines.append("")
        lines.append(f"Note: Showing first {max_columns} columns for consistent PDF layout.")

    return _build_pdf(lines)


def _safe_sheet_title(title: str, existing: set[str]) -> str:
    cleaned = re.sub(r"[\\/*?:\[\]]", "-", title).strip() or "Sheet"
    cleaned = cleaned[:31]
    candidate = cleaned
    counter = 2
    while candidate in existing:
        suffix = f"-{counter}"
        candidate = f"{cleaned[: 31 - len(suffix)]}{suffix}"
        counter += 1
    return candidate


def _is_simple_payload(payload: Any) -> bool:
    if isinstance(payload, list):
        return all(not isinstance(item, (list, dict)) for item in payload)
    if isinstance(payload, dict):
        return all(not isinstance(value, (list, dict)) for value in payload.values())
    return True


def _col_letter(index: int) -> str:
    result = ""
    while index:
        index, rem = divmod(index - 1, 26)
        result = chr(65 + rem) + result
    return result


def _cell_xml(cell_ref: str, value: Any) -> str:
    normalized = _normalize_scalar(value)
    if isinstance(normalized, bool):
        return f'<c r="{cell_ref}" t="b"><v>{1 if normalized else 0}</v></c>'
    if isinstance(normalized, (int, float)):
        return f'<c r="{cell_ref}" t="n"><v>{normalized}</v></c>'
    if isinstance(normalized, str):
        stripped = normalized.strip()
        if stripped and re.fullmatch(r"-?\d+(\.\d+)?", stripped):
            return f'<c r="{cell_ref}" t="n"><v>{stripped}</v></c>'
        return f'<c r="{cell_ref}" t="inlineStr"><is><t>{escape(normalized)}</t></is></c>'
    return f'<c r="{cell_ref}" t="inlineStr"><is><t>{escape(str(normalized))}</t></is></c>'


def _worksheet_xml(rows: list[dict[str, Any]]) -> str:
    fieldnames = sorted({key for row in rows for key in row.keys()}) if rows else ["value"]
    xml_rows: list[str] = []

    header_cells = [
        _cell_xml(f"{_col_letter(idx)}1", field)
        for idx, field in enumerate(fieldnames, start=1)
    ]
    xml_rows.append(f'<row r="1">{"".join(header_cells)}</row>')

    for row_index, row in enumerate(rows or [{"value": ""}], start=2):
        cells = [
            _cell_xml(f"{_col_letter(col_idx)}{row_index}", row.get(field, ""))
            for col_idx, field in enumerate(fieldnames, start=1)
        ]
        xml_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<sheetData>'
        + "".join(xml_rows)
        + '</sheetData></worksheet>'
    )


def _write_rows_to_sheet(sheets: list[tuple[str, list[dict[str, Any]]]], title: str, rows: list[dict[str, Any]], existing: set[str]):
    name = _safe_sheet_title(title, existing)
    existing.add(name)
    sheets.append((name, rows))


def render_report_xlsx(payload: Any) -> bytes:
    sheets: list[tuple[str, list[dict[str, Any]]]] = []
    existing: set[str] = set()

    if _is_simple_payload(payload):
        _write_rows_to_sheet(sheets, "Data", flatten_payload(payload), existing)
    else:
        metadata = payload.get("metadata") if isinstance(payload, dict) and isinstance(payload.get("metadata"), dict) else {}
        filters = payload.get("filters") if isinstance(payload, dict) and isinstance(payload.get("filters"), dict) else {}
        meta_rows = [{"section": "metadata", "key": key, "value": _normalize_scalar(value)} for key, value in sorted(metadata.items())]
        filter_rows = [{"section": "filters", "key": key, "value": _normalize_scalar(value)} for key, value in sorted(filters.items())]
        _write_rows_to_sheet(sheets, "Metadata", meta_rows + filter_rows, existing)
        _write_rows_to_sheet(sheets, "Data", flatten_payload(payload), existing)
        if isinstance(payload, dict):
            for key in sorted(payload.keys()):
                value = payload[key]
                if isinstance(value, list):
                    _write_rows_to_sheet(sheets, key, flatten_payload(value, prefix=key), existing)

    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
        + "".join(
            f'<sheet name="{escape(name)}" sheetId="{idx}" r:id="rId{idx}"/>'
            for idx, (name, _rows) in enumerate(sheets, start=1)
        )
        + '</sheets></workbook>'
    )

    workbook_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + "".join(
            f'<Relationship Id="rId{idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{idx}.xml"/>'
            for idx in range(1, len(sheets) + 1)
        )
        + '</Relationships>'
    )

    content_types_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + "".join(
            f'<Override PartName="/xl/worksheets/sheet{idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            for idx in range(1, len(sheets) + 1)
        )
        + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        '</Types>'
    )

    root_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        '</Relationships>'
    )

    now = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    core_props_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        '<dc:title>StarAcc Report Export</dc:title>'
        '<dc:creator>StarAcc</dc:creator>'
        f'<dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>'
        f'<dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>'
        '</cp:coreProperties>'
    )

    app_props_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
        '<Application>StarAcc</Application>'
        '</Properties>'
    )

    output = io.BytesIO()
    with zipfile.ZipFile(output, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types_xml)
        archive.writestr("_rels/.rels", root_rels_xml)
        archive.writestr("xl/workbook.xml", workbook_xml)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml)
        archive.writestr("docProps/core.xml", core_props_xml)
        archive.writestr("docProps/app.xml", app_props_xml)
        for idx, (_name, rows) in enumerate(sheets, start=1):
            archive.writestr(f"xl/worksheets/sheet{idx}.xml", _worksheet_xml(rows))
    return output.getvalue()
