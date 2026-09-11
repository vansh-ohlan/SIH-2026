"""Deterministic row-aware table extraction for RoR parcel rows."""

from __future__ import annotations

import re
from typing import Any, Optional

from ai_ml.extraction.exceptions import ExtractionFailureError, InvalidOCRResultError
from ai_ml.extraction.normalization import normalize_for_matching
from ai_ml.extraction.schema import (
    ExtractionMethod,
    ExtractionResult,
    ExtractedField,
    FieldProvenance,
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.extraction.strategy import ExtractionStrategy
from ai_ml.ocr.schema import OCRResult

_EXTRACTOR_VERSION = "table-v1"

# Devanagari digits for pattern matching
_DEVANAGARI_DIGITS = "०१२३४५६७८९"
_DIGIT_CLASS = f"[{_DEVANAGARI_DIGITS}\\d]"

# Patterns for table cells within a row.
# Each tuple is (field_name, value_regex, confidence)
_ROW_PATTERNS: list[tuple[str, re.Pattern[str], float]] = [
    (
        "khasra_number",
        re.compile(rf"({_DIGIT_CLASS}+(?:/{_DIGIT_CLASS}+)*)"),
        0.90,
    ),
    (
        "area_raw",
        re.compile(rf"({_DIGIT_CLASS}+(?:[-/:]{_DIGIT_CLASS}+)+)"),
        0.85,
    ),
    (
        "land_classification",
        re.compile(r"(कृषि|बंजर|ग्रामीण|नगरीय|वन|मेadow|pasture)", re.IGNORECASE),
        0.75,
    ),
    (
        "irrigation_source",
        re.compile(r"(सिंचित|असिंचित|कुआं|तालाब|नहर|ट्यूबवेल|बारिश)"),
        0.80,
    ),
    (
        "revenue",
        re.compile(r"([\d,]+(?:\.\d+)?)"),
        0.80,
    ),
]


def _get_line_center_y(line_bbox: Optional[tuple[int, int, int, int]]) -> Optional[float]:
    """Return the vertical center of a line bbox, or None if unavailable."""
    if line_bbox is None:
        return None
    return (line_bbox[1] + line_bbox[3]) / 2.0


def _group_lines_into_rows(
    lines: list[dict[str, Any]],
    y_tolerance: float = 10.0,
) -> list[list[dict[str, Any]]]:
    """Group OCR lines into candidate table rows based on Y-coordinate proximity.

    Lines without bboxes are placed into a single fallback row only if at
    least one line in the input has a bbox. If no lines have bboxes, an
    empty list is returned and the caller should treat this as a missing-
    geometry condition.

    Args:
        lines: Flattened OCR lines with bbox.
        y_tolerance: Maximum vertical distance between line centers to be
            considered part of the same row.

    Returns:
        List of rows, where each row is a list of line dicts.
    """
    with_bbox: list[tuple[float, dict[str, Any]]] = []
    without_bbox: list[dict[str, Any]] = []

    for line in lines:
        if line.get("bbox") is not None:
            cy = _get_line_center_y(line["bbox"])
            if cy is not None:
                with_bbox.append((cy, line))
                continue
        without_bbox.append(line)

    if not with_bbox:
        return []

    with_bbox.sort(key=lambda item: item[0])

    rows: list[list[dict[str, Any]]] = []
    current_row: list[dict[str, Any]] = []
    current_center: Optional[float] = None

    for cy, line in with_bbox:
        if current_center is None:
            current_row = [line]
            current_center = cy
        elif abs(cy - current_center) <= y_tolerance:
            current_row.append(line)
        else:
            rows.append(current_row)
            current_row = [line]
            current_center = cy

    if current_row:
        rows.append(current_row)

    if without_bbox:
        rows.append(without_bbox)

    return rows


def _looks_like_table_row(row_lines: list[dict[str, Any]]) -> bool:
    """Heuristic: return True if the row looks like a table/data row.

    A row is considered a table row if it contains at least one token that
    matches a known parcel-field pattern (khasra, area, revenue, etc.).
    """
    row_text = " ".join(line["text"] for line in row_lines)
    normalized = normalize_for_matching(row_text)
    for _field_name, value_regex, _confidence in _ROW_PATTERNS:
        if value_regex.search(normalized):
            return True
    return False


def _extract_row_fields(
    row_lines: list[dict[str, Any]],
) -> dict[str, Any]:
    """Extract known fields from a single row of OCR lines.

    Returns a dict mapping field_name -> extracted value info.
    """
    row_text = " ".join(line["text"] for line in row_lines)
    normalized = normalize_for_matching(row_text)
    fields: dict[str, Any] = {}

    for field_name, value_regex, confidence in _ROW_PATTERNS:
        match = value_regex.search(normalized)
        if match:
            raw_value = match.group(0).strip()
            if raw_value:
                fields[field_name] = {
                    "value": raw_value,
                    "confidence": confidence,
                    "source_text": row_text,
                }

    return fields


def _build_parcel_from_row(
    row_index: int,
    row_lines: list[dict[str, Any]],
    fields: dict[str, Any],
) -> Parcel:
    """Build a Parcel from extracted row fields.

    Provenance is derived from the row's combined bbox and text.
    """
    row_text = " ".join(line["text"] for line in row_lines)
    bboxes = [line["bbox"] for line in row_lines if line.get("bbox")]
    confidences = [line["confidence"] for line in row_lines if line.get("confidence") is not None]
    page_numbers = [line["page_number"] for line in row_lines if line.get("page_number") is not None]

    xs: list[int] = []
    ys: list[int] = []
    for bbox in bboxes:
        xs.extend([bbox[0], bbox[2]])
        ys.extend([bbox[1], bbox[3]])

    combined_bbox: Optional[tuple[int, int, int, int]] = None
    if xs and ys:
        combined_bbox = (min(xs), min(ys), max(xs), max(ys))

    avg_ocr_confidence: Optional[float] = None
    if confidences:
        avg_ocr_confidence = sum(confidences) / len(confidences)

    page_number = page_numbers[0] if page_numbers else None

    def _make_extracted_field(field_name: str, value: str, confidence: float) -> ExtractedField:
        return ExtractedField(
            value=value,
            provenance=FieldProvenance(
                source_ocr_text=row_text,
                source_bbox=combined_bbox,
                page_number=page_number,
                ocr_confidence=avg_ocr_confidence,
                extraction_confidence=confidence,
                extraction_method=ExtractionMethod.TABLE,
                extractor_version=_EXTRACTOR_VERSION,
            ),
        )

    parcel = Parcel()
    if "khasra_number" in fields:
        parcel.khasra_number = _make_extracted_field("khasra_number", fields["khasra_number"]["value"], fields["khasra_number"]["confidence"])
    if "area_raw" in fields:
        parcel.area_raw = _make_extracted_field("area_raw", fields["area_raw"]["value"], fields["area_raw"]["confidence"])
    if "land_classification" in fields:
        parcel.land_classification = _make_extracted_field("land_classification", fields["land_classification"]["value"], fields["land_classification"]["confidence"])
    if "irrigation_source" in fields:
        parcel.irrigation_source = _make_extracted_field("irrigation_source", fields["irrigation_source"]["value"], fields["irrigation_source"]["confidence"])
    if "revenue" in fields:
        parcel.revenue = _make_extracted_field("revenue", fields["revenue"]["value"], fields["revenue"]["confidence"])

    return parcel


class TableExtractor(ExtractionStrategy):
    """Deterministic row-aware table extraction strategy.

    Groups OCR lines into rows based on Y-coordinate proximity and extracts
    parcel fields within each row. This prevents parcel information from
    being mixed between rows.

    If bounding boxes are unavailable, the extractor falls back to a single
    non-row-aware pass or returns partial results.
    """

    def extract(
        self,
        ocr_result: OCRResult,
        config: Optional[dict[str, Any]] = None,
    ) -> ExtractionResult:
        if ocr_result is None or not isinstance(ocr_result, OCRResult):
            raise InvalidOCRResultError("Invalid OCR result provided to TableExtractor.")

        lines = self._flatten_ocr_result(ocr_result)
        if not lines:
            return ExtractionResult(
                record=RoRRecord(),
                status="partial",
                warnings=["No OCR text available for table extraction"],
                extractor_version=_EXTRACTOR_VERSION,
            )

        rows = _group_lines_into_rows(lines)

        if not rows:
            return ExtractionResult(
                record=RoRRecord(),
                status="partial",
                warnings=["No bounding boxes available for table extraction"],
                extractor_version=_EXTRACTOR_VERSION,
            )

        parcels: list[Parcel] = []
        unrecognized_rows: list[str] = []
        warnings: list[str] = []

        for row_index, row_lines in enumerate(rows):
            if not _looks_like_table_row(row_lines):
                unrecognized_rows.extend(line["text"] for line in row_lines)
                continue

            fields = _extract_row_fields(row_lines)
            if fields:
                parcel = _build_parcel_from_row(row_index, row_lines, fields)
                parcels.append(parcel)

        if not parcels:
            status = "partial"
            warnings.append("No table rows detected in OCR text")
        else:
            status = "success"

        record = RoRRecord(
            metadata=RoRMetadata(),
            landholders=[],
            parcels=parcels,
            unrecognized_text=unrecognized_rows,
            warnings=warnings,
        )

        return ExtractionResult(
            record=record,
            status=status,
            warnings=warnings,
            extractor_version=_EXTRACTOR_VERSION,
        )

    def _flatten_ocr_result(self, ocr_result: OCRResult) -> list[dict[str, Any]]:
        lines: list[dict[str, Any]] = []
        for page in ocr_result.pages:
            for block in page.blocks:
                for line in block.lines:
                    line_text = " ".join(word.text for word in line.words if word.text)
                    if not line_text.strip():
                        continue
                    confidences = [word.confidence for word in line.words if word.confidence is not None]
                    avg_conf = sum(confidences) / len(confidences) if confidences else None
                    lines.append({
                        "text": line_text,
                        "confidence": avg_conf,
                        "bbox": line.bbox,
                        "page_number": page.page_number,
                    })
        return lines
