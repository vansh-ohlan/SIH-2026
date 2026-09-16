"""Deterministic validator for ExtractionResult."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from ai_ml.extraction.schema import ExtractionResult, FieldProvenance


@dataclass
class ValidationIssue:
    """A single validation issue found in an ExtractionResult."""

    field: str
    code: str
    severity: str
    message: str
    value: Optional[Any] = None


@dataclass
class ValidationResult:
    """Structured validation result."""

    is_valid: bool
    issues: list[ValidationIssue] = field(default_factory=list)
    summary: str = ""

    def add_issue(
        self,
        field: str,
        code: str,
        severity: str,
        message: str,
        value: Optional[Any] = None,
    ) -> None:
        self.issues.append(
            ValidationIssue(
                field=field,
                code=code,
                severity=severity,
                message=message,
                value=value,
            )
        )


class ExtractionValidator:
    """Deterministic rule-based validator for ExtractionResult.

    Reports problems but does not silently repair extracted data.
    """

    def validate(self, result: ExtractionResult) -> ValidationResult:
        validation = ValidationResult(is_valid=True, summary="Validation passed")
        record = result.record

        if record is None:
            validation.is_valid = False
            validation.summary = "Validation failed: missing record"
            validation.add_issue(
                field="record",
                code="missing_record",
                severity="error",
                message="ExtractionResult contains no record",
                value=None,
            )
            return validation

        self._validate_metadata(record, validation)
        self._validate_parcels(record, validation)
        self._validate_ocr_confidence(record, validation)
        self._validate_extraction_confidence(record, validation)
        self._validate_conflicts(result, validation)

        error_issues = [issue for issue in validation.issues if issue.severity == "error"]
        if error_issues:
            validation.is_valid = False
            validation.summary = (
                f"Validation failed: {len(error_issues)} error(s) found"
            )
        else:
            validation.is_valid = True
            validation.summary = "Validation passed"

        return validation

    def _validate_metadata(self, record, validation: ValidationResult) -> None:
        metadata = record.metadata

        required_fields = [
            ("khata_number", "required_khata_number"),
        ]
        for field_name, code in required_fields:
            if getattr(metadata, field_name, None) is None:
                validation.add_issue(
                    field=field_name,
                    code=code,
                    severity="error",
                    message=f"Required field '{field_name}' is missing",
                    value=None,
                )

        khata = metadata.khata_number
        if khata is not None:
            val = khata.value
            if not _is_valid_khata_khasra(val):
                validation.add_issue(
                    field="khata_number",
                    code="invalid_khata_value",
                    severity="error",
                    message="Khata number is empty or contains only separators",
                    value=val,
                )

        khewat = metadata.khewat_number
        if khewat is not None:
            val = khewat.value
            if not _is_valid_khata_khasra(val):
                validation.add_issue(
                    field="khewat_number",
                    code="invalid_khewat_value",
                    severity="warning",
                    message="Khewat number is empty or contains only separators",
                    value=val,
                )

        khatoni = metadata.khatoni_number
        if khatoni is not None:
            val = khatoni.value
            if not _is_valid_khata_khasra(val):
                validation.add_issue(
                    field="khatoni_number",
                    code="invalid_khatoni_value",
                    severity="warning",
                    message="Khatoni number is empty or contains only separators",
                    value=val,
                )

        self._check_duplicates(record, validation)

    def _validate_parcels(self, record, validation: ValidationResult) -> None:
        for idx, parcel in enumerate(record.parcels):
            prefix = f"parcels[{idx}]"

            if parcel.khasra_number is None:
                validation.add_issue(
                    field=f"{prefix}.khasra_number",
                    code="missing_khasra_number",
                    severity="error",
                    message="Khasra number is missing from parcel",
                    value=None,
                )
            else:
                val = parcel.khasra_number.value
                if not _is_valid_khata_khasra(val):
                    validation.add_issue(
                        field=f"{prefix}.khasra_number",
                        code="invalid_khasra_value",
                        severity="error",
                        message="Khasra number is empty or contains only separators",
                        value=val,
                    )

            if parcel.area_raw is not None:
                val = parcel.area_raw.value
                if not _is_valid_area(val):
                    validation.add_issue(
                        field=f"{prefix}.area_raw",
                        code="malformed_area",
                        severity="warning",
                        message="Area value appears malformed",
                        value=val,
                    )

            if parcel.revenue is not None:
                val = parcel.revenue.value
                numeric_str = "".join(ch for ch in str(val) if ch.isdigit() or ch == ".")
                if numeric_str:
                    try:
                        float(numeric_str)
                    except ValueError:
                        validation.add_issue(
                            field=f"{prefix}.revenue",
                            code="invalid_numeric_value",
                            severity="warning",
                            message="Revenue value contains non-numeric characters",
                            value=val,
                        )

    def _validate_ocr_confidence(self, record, validation: ValidationResult) -> None:
        all_fields = self._collect_fields(record)
        for field_name, extracted_field in all_fields:
            if extracted_field is None or extracted_field.provenance is None:
                continue
            prov = extracted_field.provenance
            if prov.ocr_confidence is not None and prov.ocr_confidence < 0.5:
                validation.add_issue(
                    field=field_name,
                    code="low_ocr_confidence",
                    severity="warning",
                    message=f"OCR confidence is low ({prov.ocr_confidence:.2f})",
                    value=prov.ocr_confidence,
                )

    def _validate_extraction_confidence(self, record, validation: ValidationResult) -> None:
        all_fields = self._collect_fields(record)
        for field_name, extracted_field in all_fields:
            if extracted_field is None or extracted_field.provenance is None:
                continue
            prov = extracted_field.provenance
            if prov.extraction_confidence is not None and prov.extraction_confidence < 0.5:
                validation.add_issue(
                    field=field_name,
                    code="low_extraction_confidence",
                    severity="warning",
                    message=f"Extraction confidence is low ({prov.extraction_confidence:.2f})",
                    value=prov.extraction_confidence,
                )

    def _validate_conflicts(self, result: ExtractionResult, validation: ValidationResult) -> None:
        conflicts = getattr(result, "conflicts", None) or []
        for conflict in conflicts:
            field_name = conflict.get("field", "unknown")
            values = conflict.get("values", [])
            value_strs = [str(v.get("value", "")) for v in values]
            validation.add_issue(
                field=field_name,
                code="conflicting_extracted_values",
                severity="warning",
                message=f"Multiple extractors returned different values for '{field_name}': {value_strs}",
                value=value_strs,
            )

    def _collect_fields(self, record) -> list[tuple[str, Any]]:
        fields = []
        metadata_fields = [
            "document_id", "state", "district", "tehsil", "village", "year",
            "document_type", "khata_number", "khewat_number", "khatoni_number",
            "mutation_number", "mutation_date", "mutation_details",
        ]
        for f in metadata_fields:
            fields.append((f, getattr(record.metadata, f, None)))
        return fields

    def _check_duplicates(self, record, validation: ValidationResult) -> None:
        seen: dict[str, list[tuple[str, Any]]] = {}
        all_fields = self._collect_fields(record)
        for field_name, extracted_field in all_fields:
            if extracted_field is None or extracted_field.value is None:
                continue
            val_str = str(extracted_field.value).strip().lower()
            seen.setdefault(val_str, []).append(field_name)

        for val_str, field_list in seen.items():
            if len(field_list) > 1:
                validation.add_issue(
                    field=", ".join(field_list),
                    code="duplicate_extracted_values",
                    severity="warning",
                    message=f"Multiple fields have the same value: '{val_str}'",
                    value=val_str,
                )


def _is_valid_khata_khasra(value: Any) -> bool:
    if not value:
        return False
    val = str(value).strip()
    if not val:
        return False
    cleaned = val.replace("/", "").replace("-", "").replace(".", "").strip()
    return bool(cleaned)


def _is_valid_area(value: Any) -> bool:
    if not value:
        return False
    val = str(value).strip()
    if not val:
        return False
    return any(ch.isdigit() for ch in val)
