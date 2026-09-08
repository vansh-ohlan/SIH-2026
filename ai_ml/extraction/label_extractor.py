"""Deterministic label-based field extraction for RoR documents."""

from __future__ import annotations

import re
from typing import Any, Optional

from ai_ml.extraction.exceptions import ExtractionFailureError, InvalidOCRResultError
from ai_ml.extraction.schema import (
    ExtractionMethod,
    ExtractionResult,
    ExtractedField,
    FieldProvenance,
    Landholder,
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.extraction.strategy import ExtractionStrategy
from ai_ml.ocr.schema import OCRResult


_EXTRACTOR_VERSION = "label-v1"

_LABEL_MAP: dict[str, dict[str, str]] = {
    "state": {"en": "state", "hi": "राज्य"},
    "district": {"en": "district", "hi": "जिला"},
    "tehsil": {"en": "tehsil", "hi": "तहसील"},
    "village": {"en": "village", "hi": "ग्राम"},
    "year": {"en": "year", "hi": "साल"},
    "khata_number": {"en": "khata number", "hi": "खाता संख्या"},
    "khewat_number": {"en": "khewat number", "hi": "खेवट संख्या"},
    "khatoni_number": {"en": "khatoni number", "hi": "खतौनी संख्या"},
    "khasra_number": {"en": "khasra number", "hi": "खसरा संख्या"},
    "landholder_name": {"en": "name of owner", "hi": "खातेदार का नाम"},
    "father_or_husband_name": {"en": "father name", "hi": "पिता का नाम"},
    "address": {"en": "address", "hi": "पता"},
    "area": {"en": "area", "hi": "रकबा"},
    "land_classification": {"en": "land classification", "hi": "सामाजिक वर्गीकरण"},
    "irrigation_source": {"en": "irrigation source", "hi": "सिंचाई का स्रोत"},
    "revenue": {"en": "revenue", "hi": "राजस्व"},
    "mutation_number": {"en": "mutation number", "hi": "नामांतरण संख्या"},
    "mutation_details": {"en": "mutation details", "hi": "नामांतरण विवरण"},
    "remarks": {"en": "remarks", "hi": "विवरण"},
}

_EXTRA_LABEL_VARIANTS: dict[str, list[str]] = {
    "father_or_husband_name": [
        "father's name",
        "husband's name",
        "father name",
        "husband name",
        "पिता का नाम",
        "पति का नाम",
    ],
    "landholder_name": [
        "name of owner",
        "owner name",
        "landholder name",
        "खातेदार का नाम",
    ],
}

_FIELD_ORDER = [
    "state",
    "district",
    "tehsil",
    "village",
    "year",
    "khata_number",
    "khewat_number",
    "khatoni_number",
    "khasra_number",
    "landholder_name",
    "father_or_husband_name",
    "address",
    "area",
    "land_classification",
    "irrigation_source",
    "revenue",
    "mutation_number",
    "mutation_details",
    "remarks",
]


def _normalize_text(text: str) -> str:
    return text.strip().lower()


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


def _extract_value_from_line(line, label_end_index: int) -> str:
    words = [word.text for word in line.words if word.text]
    return " ".join(words[label_end_index:]).strip()


def _find_label_in_line(line_text: str) -> Optional[tuple[str, int]]:
    normalized = _normalize_text(line_text)
    for field_name, labels in _LABEL_MAP.items():
        for label in labels.values():
            norm_label = _normalize_text(label)
            if normalized.startswith(norm_label):
                return field_name, len(norm_label.split())
            if norm_label in normalized:
                return field_name, len(norm_label.split())
    for field_name, variants in _EXTRA_LABEL_VARIANTS.items():
        for variant in variants:
            norm_variant = _normalize_text(variant)
            if normalized.startswith(norm_variant):
                return field_name, len(norm_variant.split())
            if norm_variant in normalized:
                return field_name, len(norm_variant.split())
    return None


def _extract_value(
    lines: list[dict[str, Any]],
    line_index: int,
    label_end_index: int,
) -> tuple[str, Optional[float], Optional[tuple[int, int, int, int]], int, Optional[str]]:
    same_line_text = lines[line_index]["text"]
    same_line_conf = lines[line_index]["confidence"]
    same_line_bbox = lines[line_index]["bbox"]
    page_number = lines[line_index]["page_number"]

    value = _extract_value_from_line_text(same_line_text, label_end_index)
    extraction_confidence = 0.9

    if not value and line_index + 1 < len(lines):
        next_line = lines[line_index + 1]
        value = _extract_value_from_line_text(next_line["text"], 0)
        extraction_confidence = 0.6
        if value:
            same_line_bbox = next_line["bbox"]
            same_line_conf = next_line["confidence"]
            page_number = next_line["page_number"]

    return value, same_line_conf, same_line_bbox, page_number, extraction_confidence


def _extract_value_from_line_text(line_text: str, start_index: int) -> str:
    words = line_text.split()
    if start_index < len(words):
        return " ".join(words[start_index:]).strip()
    return ""


class LabelExtractor(ExtractionStrategy):
    """Deterministic label-based extraction strategy.

    This extractor scans OCR output for known Hindi/English field labels
    and extracts adjacent text values. It is intentionally conservative:
    it does not guess values when labels are ambiguous or missing.
    """

    def extract(
        self,
        ocr_result: OCRResult,
        config: Optional[dict[str, Any]] = None,
    ) -> ExtractionResult:
        if ocr_result is None or not isinstance(ocr_result, OCRResult):
            raise InvalidOCRResultError("Invalid OCR result provided to LabelExtractor.")

        lines = self._flatten_ocr_result(ocr_result)
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

        for line_index, line in enumerate(lines):
            line_text = line["text"]
            match = _find_label_in_line(line_text)
            if not match:
                unrecognized_text.append(line_text)
                continue

            field_name, label_word_count = match
            value, ocr_conf, bbox, page_number, extraction_conf = _extract_value(
                lines, line_index, label_word_count
            )

            if not value:
                warnings.append(f"{field_name}: label found but no value extracted")
                continue

            provenance = FieldProvenance(
                source_ocr_text=line_text,
                source_bbox=bbox,
                page_number=page_number,
                ocr_confidence=ocr_conf,
                extraction_confidence=extraction_conf,
                extraction_method=ExtractionMethod.LABEL,
                extractor_version=_EXTRACTOR_VERSION,
            )

            extracted_field = ExtractedField(value=value, provenance=provenance)

            if field_name in ("state", "district", "tehsil", "village", "year",
                              "khata_number", "khewat_number", "khatoni_number"):
                setattr(metadata, field_name, extracted_field)
                extracted_fields[field_name] = extracted_field
            elif field_name == "khasra_number":
                parcels.append(Parcel(khasra_number=extracted_field))
            elif field_name == "landholder_name":
                landholders.append(Landholder(name=extracted_field))
            elif field_name == "father_or_husband_name":
                if not landholders:
                    landholders.append(Landholder())
                landholders[-1].father_or_husband_name = extracted_field
            elif field_name == "address":
                if not landholders:
                    landholders.append(Landholder())
                landholders[-1].address = extracted_field
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
            elif field_name == "mutation_number":
                setattr(metadata, field_name, extracted_field)
            elif field_name == "mutation_details":
                setattr(metadata, field_name, extracted_field)
            elif field_name == "remarks":
                if document_remarks is None:
                    document_remarks = ExtractedField(
                        value=value,
                        provenance=FieldProvenance(
                            source_ocr_text=line_text,
                            source_bbox=bbox,
                            page_number=page_number,
                            ocr_confidence=ocr_conf,
                            extraction_confidence=extraction_conf,
                            extraction_method=ExtractionMethod.LABEL,
                            extractor_version=_EXTRACTOR_VERSION,
                        ),
                    )
                else:
                    document_remarks.value = f"{document_remarks.value} {value}"
            extracted_fields[field_name] = extracted_field

        if not landholders and not parcels and not any(
            getattr(metadata, f) is not None for f in _FIELD_ORDER if hasattr(metadata, f)
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

    def _flatten_ocr_result(self, ocr_result: OCRResult) -> list[dict[str, Any]]:
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
