"""Deterministic pattern/regex-based field extraction for RoR documents."""

from __future__ import annotations

import re
from typing import Any, Optional

from ai_ml.extraction.exceptions import ExtractionFailureError, InvalidOCRResultError
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


_EXTRACTOR_VERSION = "pattern-v1"

# Devanagari digit characters for numeral-aware patterns
_DEVANAGARI_DIGITS = "०१२३४५६७८९"
_DIGIT_CLASS = f"[{_DEVANAGARI_DIGITS}\\d]"

# Pattern definitions:
# (field_name, context_regex, value_regex, extraction_confidence)
# Context regex must match in the line to reduce false positives.
# Value regex captures the exact field value.
_PATTERN_DEFS: list[tuple[str, re.Pattern[str], re.Pattern[str], float]] = [
    (
        "year",
        re.compile(r"(?:year|साल|financial\s+year|वित्तीय\s+वर्ष)", re.IGNORECASE),
        re.compile(rf"({_DIGIT_CLASS}{{4}}(?:\s*[-–]\s*{_DIGIT_CLASS}{{2,4}})?)"),
        0.90,
    ),
    (
        "khata_number",
        re.compile(r"(?:khata\s+number|खाता\s+संख्या|खाता)", re.IGNORECASE),
        re.compile(rf"({_DIGIT_CLASS}+(?:/{_DIGIT_CLASS}+)*)"),
        0.90,
    ),
    (
        "khewat_number",
        re.compile(r"(?:khewat\s+number|खेवट\s+संख्या|खेवट)", re.IGNORECASE),
        re.compile(rf"({_DIGIT_CLASS}+)"),
        0.90,
    ),
    (
        "khatoni_number",
        re.compile(r"(?:khatoni\s+number|खतौनी\s+संख्या|खतौनी)", re.IGNORECASE),
        re.compile(rf"({_DIGIT_CLASS}+)"),
        0.90,
    ),
    (
        "khasra_number",
        re.compile(r"(?:khasra\s+number|खसरा\s+संख्या|खसरा)", re.IGNORECASE),
        re.compile(rf"({_DIGIT_CLASS}+(?:/{_DIGIT_CLASS}+)*)"),
        0.90,
    ),
    (
        "mutation_number",
        re.compile(r"(?:mutation\s+number|नामांतरण\s+संख्या|म्यूटेशन)", re.IGNORECASE),
        re.compile(r"([\w\u0900-\u097F-]+(?:/[\w\u0900-\u097F-]+)*)"),
        0.75,
    ),
    (
        "mutation_date",
        re.compile(
            r"(?:mutation\s+date|नामांतरण\s+दिनांक|नामांतरण\s+तारीख|म्यूटेशन\s+डेट)",
            re.IGNORECASE,
        ),
        re.compile(rf"({_DIGIT_CLASS}{{4}}[./-]{_DIGIT_CLASS}{{1,2}}[./-]{_DIGIT_CLASS}{{1,2}})"),
        0.90,
    ),
    (
        "area",
        re.compile(r"(?:area|रकबा|क्षेत्रफल)", re.IGNORECASE),
        re.compile(rf"({_DIGIT_CLASS}+(?:[-/:]{_DIGIT_CLASS}+)+)"),
        0.90,
    ),
    (
        "revenue",
        re.compile(r"(?:revenue|राजस्व|राजस्व\s+राशि)", re.IGNORECASE),
        re.compile(r"([\d,]+(?:\.\d+)?\s*(?:INR|रुपए)?)"),
        0.75,
    ),
]


def _get_line_text(line) -> str:
    return " ".join(word.text for word in line.words if word.text)


def _get_line_confidence(line) -> Optional[float]:
    confidences = [word.confidence for word in line.words if word.confidence is not None]
    if not confidences:
        return None
    return sum(confidences) / len(confidences)


def _get_line_bbox(line) -> Optional[tuple[int, int, int, int]]:
    if line.bbox:
        return line.bbox
    if not line.words:
        return None
    xs = []
    ys = []
    for word in line.words:
        if word.bbox:
            xs.extend([word.bbox[0], word.bbox[2]])
            ys.extend([word.bbox[1], word.bbox[3]])
    if not xs or not ys:
        return None
    return (min(xs), min(ys), max(xs), max(ys))


def _flatten_ocr_result(ocr_result: OCRResult) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []
    for page in ocr_result.pages:
        for block in page.blocks:
            for line in block.lines:
                line_text = _get_line_text(line)
                if not line_text.strip():
                    continue
                lines.append({
                    "text": line_text,
                    "confidence": _get_line_confidence(line),
                    "bbox": _get_line_bbox(line),
                    "page_number": page.page_number,
                })
    return lines


class PatternExtractor(ExtractionStrategy):
    """Deterministic pattern/regex-based extraction strategy.

    This extractor applies conservative regex patterns to OCR text to
    extract structured field values. Each pattern requires surrounding
    context keywords to reduce false positives. It does not perform
    fuzzy matching, spatial reasoning, or ML inference.
    """

    def extract(
        self,
        ocr_result: OCRResult,
        config: Optional[dict[str, Any]] = None,
    ) -> ExtractionResult:
        if ocr_result is None or not isinstance(ocr_result, OCRResult):
            raise InvalidOCRResultError("Invalid OCR result provided to PatternExtractor.")

        lines = _flatten_ocr_result(ocr_result)
        if not lines:
            return ExtractionResult(
                record=RoRRecord(),
                status="partial",
                warnings=["No OCR text available for extraction"],
                extractor_version=_EXTRACTOR_VERSION,
            )

        metadata = RoRMetadata()
        landholders: list[Landholder] = []
        parcels: list[Parcel] = []
        document_remarks: Optional[ExtractedField] = None
        unrecognized_text: list[str] = []
        warnings: list[str] = []

        extracted_fields: dict[str, ExtractedField] = {}
        seen_line_fields: dict[int, set[str]] = {}

        for line_index, line in enumerate(lines):
            line_text = line["text"]
            best_match: Optional[tuple[str, str, float]] = None
            best_confidence = -1.0

            for field_name, context_regex, value_regex, pattern_confidence in _PATTERN_DEFS:
                context_match = context_regex.search(line_text)
                if not context_match:
                    continue

                value_search_start = context_match.end()
                value_match = value_regex.search(line_text, value_search_start)
                if not value_match:
                    continue

                value = value_match.group(0).strip()
                if not value:
                    continue

                if pattern_confidence > best_confidence:
                    best_match = (field_name, value, pattern_confidence)
                    best_confidence = pattern_confidence

            if not best_match:
                unrecognized_text.append(line_text)
                continue

            field_name, value, extraction_confidence = best_match

            if field_name in seen_line_fields.get(line_index, set()):
                continue
            seen_line_fields.setdefault(line_index, set()).add(field_name)

            provenance = FieldProvenance(
                source_ocr_text=line_text,
                source_bbox=line["bbox"],
                page_number=line["page_number"],
                ocr_confidence=line["confidence"],
                extraction_confidence=extraction_confidence,
                extraction_method=ExtractionMethod.REGEX,
                extractor_version=_EXTRACTOR_VERSION,
            )

            extracted_field = ExtractedField(value=value, provenance=provenance)

            if field_name in ("state", "district", "tehsil", "village", "year",
                              "khata_number", "khewat_number", "khatoni_number", "mutation_number", "mutation_date"):
                setattr(metadata, field_name, extracted_field)
                extracted_fields[field_name] = extracted_field
            elif field_name == "khasra_number":
                parcels.append(Parcel(khasra_number=extracted_field))
            elif field_name == "area":
                if not parcels:
                    parcels.append(Parcel())
                parcels[-1].area_raw = extracted_field
            elif field_name == "land_classification":
                if not parcels:
                    parcels.append(Parcel())
                parcels[-1].land_classification = extracted_field
            elif field_name == "irrigation_source":
                if not parcels:
                    parcels.append(Parcel())
                parcels[-1].irrigation_source = extracted_field
            elif field_name == "revenue":
                if not parcels:
                    parcels.append(Parcel())
                parcels[-1].revenue = extracted_field
            elif field_name == "mutation_details":
                setattr(metadata, field_name, extracted_field)
            elif field_name == "remarks":
                if document_remarks is None:
                    document_remarks = ExtractedField(
                        value=value,
                        provenance=FieldProvenance(
                            source_ocr_text=line_text,
                            source_bbox=line["bbox"],
                            page_number=line["page_number"],
                            ocr_confidence=line["confidence"],
                            extraction_confidence=extraction_confidence,
                            extraction_method=ExtractionMethod.REGEX,
                            extractor_version=_EXTRACTOR_VERSION,
                        ),
                    )
                else:
                    document_remarks.value = f"{document_remarks.value} {value}"
            extracted_fields[field_name] = extracted_field

        if not landholders and not parcels and not any(
            getattr(metadata, f) is not None for f in [
                "state", "district", "tehsil", "village", "year",
                "khata_number", "khewat_number", "khatoni_number",
                "mutation_number", "mutation_date", "mutation_details"
            ] if hasattr(metadata, f)
        ):
            status = "partial"
            warnings.append("No recognized fields extracted from OCR text")
        else:
            status = "success"

        record = RoRRecord(
            metadata=metadata,
            landholders=landholders,
            parcels=parcels,
            document_remarks=document_remarks,
            unrecognized_text=unrecognized_text,
            warnings=warnings,
        )

        return ExtractionResult(
            record=record,
            status=status,
            warnings=warnings,
            extractor_version=_EXTRACTOR_VERSION,
        )
