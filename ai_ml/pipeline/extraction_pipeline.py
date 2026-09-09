"""Extraction pipeline combining label and pattern extraction with validation."""

from __future__ import annotations

from typing import Any, Optional

from ai_ml.extraction.exceptions import InvalidOCRResultError
from ai_ml.extraction.label_extractor import LabelExtractor
from ai_ml.extraction.pattern_extractor import PatternExtractor
from ai_ml.extraction.schema import (
    ExtractionResult,
    ExtractedField,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.extraction.strategy import ExtractionStrategy
from ai_ml.extraction.validator import ExtractionValidator
from ai_ml.ocr.schema import OCRResult


class ExtractionPipeline(ExtractionStrategy):
    """Deterministic extraction pipeline combining label and pattern extraction.

    Flow:
    OCRResult -> LabelExtractor -> PatternExtractor -> merge -> Validator -> result + issues
    """

    def __init__(self) -> None:
        self._label_extractor = LabelExtractor()
        self._pattern_extractor = PatternExtractor()
        self._validator = ExtractionValidator()

    def extract(
        self,
        ocr_result: OCRResult,
        config: Optional[dict[str, Any]] = None,
    ) -> ExtractionResult:
        if ocr_result is None or not isinstance(ocr_result, OCRResult):
            raise InvalidOCRResultError("Invalid OCR result provided to ExtractionPipeline.")

        label_result = self._label_extractor.extract(ocr_result, config)
        pattern_result = self._pattern_extractor.extract(ocr_result, config)

        merged_record, conflicts = self._merge_results(label_result, pattern_result)
        merged_result = ExtractionResult(
            record=merged_record,
            status=self._combine_status(label_result, pattern_result),
            warnings=label_result.warnings + pattern_result.warnings,
            extractor_version="pipeline-v1",
            raw_ocr_result_summary=label_result.raw_ocr_result_summary,
            conflicts=conflicts,
        )

        validation = self._validator.validate(merged_result)
        merged_result.warnings.extend(
            [f"[validation] {issue.message}" for issue in validation.issues]
        )
        merged_result.validation_error_count = sum(
            1 for issue in validation.issues if issue.severity == "error"
        )
        merged_result.validation_warning_count = sum(
            1 for issue in validation.issues if issue.severity == "warning"
        )

        return merged_result

    def _merge_results(
        self, label_result: ExtractionResult, pattern_result: ExtractionResult
    ) -> tuple[RoRRecord, list[dict[str, Any]]]:
        label_record = label_result.record if label_result.record else RoRRecord()
        pattern_record = pattern_result.record if pattern_result.record else RoRRecord()

        merged_metadata, metadata_conflicts = self._merge_metadata(
            label_record.metadata, pattern_record.metadata
        )
        merged_landholders = self._merge_landholders(
            label_record.landholders, pattern_record.landholders
        )
        merged_parcels = self._merge_parcels(
            label_record.parcels, pattern_record.parcels
        )

        merged_remarks = label_record.document_remarks
        if merged_remarks is None:
            merged_remarks = pattern_record.document_remarks

        merged_unrecognized = list(label_record.unrecognized_text) + list(
            pattern_record.unrecognized_text
        )
        merged_warnings = list(label_record.warnings) + list(pattern_record.warnings)

        merged_record = RoRRecord(
            metadata=merged_metadata,
            landholders=merged_landholders,
            parcels=merged_parcels,
            document_remarks=merged_remarks,
            unrecognized_text=merged_unrecognized,
            warnings=merged_warnings,
        )

        return merged_record, metadata_conflicts

    def _merge_metadata(self, label_meta, pattern_meta) -> tuple[RoRMetadata, list[dict[str, Any]]]:
        fields = [
            "document_id", "state", "district", "tehsil", "village", "year",
            "document_type", "khata_number", "khewat_number", "khatoni_number",
            "mutation_number", "mutation_date", "mutation_details",
        ]
        merged = {}
        conflicts = []
        for f in fields:
            label_field = getattr(label_meta, f, None)
            pattern_field = getattr(pattern_meta, f, None)
            merged_field, conflict = self._merge_field(label_field, pattern_field, field_name=f)
            merged[f] = merged_field
            if conflict is not None:
                conflicts.append(conflict)

        label_state_specific = dict(getattr(label_meta, "state_specific_fields", None) or {})
        pattern_state_specific = dict(getattr(pattern_meta, "state_specific_fields", None) or {})
        merged_state_specific = dict(label_state_specific)
        for key, pattern_value in pattern_state_specific.items():
            if key not in merged_state_specific:
                merged_state_specific[key] = pattern_value
            else:
                existing = merged_state_specific[key]
                if existing != pattern_value:
                    conflicts.append({
                        "field": f"state_specific_fields.{key}",
                        "values": [
                            {"value": existing, "method": "label"},
                            {"value": pattern_value, "method": "regex"},
                        ],
                    })

        return RoRMetadata(**merged, state_specific_fields=merged_state_specific), conflicts

    def _merge_field(
        self, field_a: Optional[ExtractedField], field_b: Optional[ExtractedField], field_name: str = ""
    ) -> tuple[Optional[ExtractedField], Optional[dict[str, Any]]]:
        if field_a is None and field_b is None:
            return None, None
        if field_a is None:
            return field_b, None
        if field_b is None:
            return field_a, None

        val_a = field_a.value
        val_b = field_b.value
        if val_a == val_b:
            return self._prefer_higher_confidence(field_a, field_b), None

        conflict = {
            "field": field_name,
            "values": [
                {
                    "value": val_a,
                    "method": field_a.provenance.extraction_method if field_a.provenance else "unknown",
                    "confidence": (field_a.provenance.extraction_confidence or 0.0) if field_a.provenance else 0.0,
                },
                {
                    "value": val_b,
                    "method": field_b.provenance.extraction_method if field_b.provenance else "unknown",
                    "confidence": (field_b.provenance.extraction_confidence or 0.0) if field_b.provenance else 0.0,
                },
            ],
        }
        return self._prefer_higher_confidence(field_a, field_b), conflict

    def _merge_landholders(self, label_holders, pattern_holders) -> list:
        from ai_ml.extraction.schema import Landholder
        merged = []
        for holder in label_holders + pattern_holders:
            if holder.name is not None or holder.father_or_husband_name is not None:
                merged.append(holder)
        return merged

    def _merge_parcels(self, label_parcels, pattern_parcels) -> list:
        merged = list(label_parcels)
        for p in pattern_parcels:
            merged.append(p)
        return merged

    def _prefer_higher_confidence(
        self, field_a: Optional[ExtractedField], field_b: Optional[ExtractedField], field_name: str = ""
    ) -> Optional[ExtractedField]:
        if field_a is None:
            return field_b
        if field_b is None:
            return field_a
        conf_a = (field_a.provenance.extraction_confidence or 0.0) if field_a.provenance else 0.0
        conf_b = (field_b.provenance.extraction_confidence or 0.0) if field_b.provenance else 0.0
        if conf_a >= conf_b:
            return field_a
        return field_b

    def _combine_status(self, label_result: ExtractionResult, pattern_result: ExtractionResult) -> str:
        if label_result.status == "success" or pattern_result.status == "success":
            return "success"
        if label_result.status == "partial" or pattern_result.status == "partial":
            return "partial"
        return "failure"
