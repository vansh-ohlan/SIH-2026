"""Deterministic confidence scoring for ExtractionResult."""

from __future__ import annotations

from typing import Any, Optional

from ai_ml.extraction.schema import ExtractionResult


def compute_overall_confidence(result: ExtractionResult) -> float:
    """Compute overall confidence score for an ExtractionResult.

    Scoring rules (all values in [0, 1]):
    1. Start from the mean extraction confidence of all extracted fields.
       If no fields are present, use 0.5 as the neutral base.
    2. Subtract penalty for validation errors: 0.10 per error, capped at 0.50.
    3. Subtract penalty for validation warnings: 0.05 per warning, capped at 0.30.
    4. Subtract penalty for extractor conflicts: 0.05 per conflict, capped at 0.20.
    5. Add agreement bonus: +0.05 if all of the following are true:
       - at least one field was extracted
       - zero extractor conflicts
       - zero validation errors
       - zero validation warnings
    6. Clamp final score to [0.0, 1.0].

    Rationale:
    - Errors are the strongest negative signal (missing required fields,
      invalid values), so they carry the highest per-occurrence penalty.
    - Warnings indicate quality concerns but do not invalidate the record,
      so they carry a moderate penalty.
    - Conflicts indicate disagreement between independent extractors, which
      reduces trust; each conflict is penalized modestly.
    - Agreement between extractors is a positive signal and is rewarded with
      a small bonus.
    - All penalties are capped so that a single category cannot dominate
      the score; the final score remains bounded and interpretable.

    Args:
        result: ExtractionResult produced by the extraction pipeline.

    Returns:
        Overall confidence score in [0.0, 1.0].
    """
    confidences = _collect_extraction_confidences(result)
    base = sum(confidences) / len(confidences) if confidences else 0.5

    num_errors = result.validation_error_count
    num_warnings = result.validation_warning_count
    num_conflicts = len(getattr(result, "conflicts", None) or [])

    error_penalty = min(0.5, num_errors * 0.10)
    warning_penalty = min(0.3, num_warnings * 0.05)
    conflict_penalty = min(0.2, num_conflicts * 0.05)
    agreement_bonus = 0.05 if (num_conflicts == 0 and num_errors == 0 and num_warnings == 0 and confidences) else 0.0

    score = base - error_penalty - warning_penalty - conflict_penalty + agreement_bonus
    return max(0.0, min(1.0, score))


def compute_confidence_factors(result: ExtractionResult) -> list[dict[str, Any]]:
    """Return a list of human-readable factors that contributed to the confidence score.

    Each factor dict contains at least:
    - name: factor identifier
    - impact: positive/negative/neutral effect description
    - value: numeric value or count associated with the factor

    Args:
        result: ExtractionResult produced by the extraction pipeline.

    Returns:
        List of factor dicts.
    """
    factors = []
    confidences = _collect_extraction_confidences(result)
    base = sum(confidences) / len(confidences) if confidences else 0.5
    factors.append({
        "name": "base_confidence",
        "impact": "neutral",
        "description": "Mean extraction confidence across extracted fields (0.5 if none).",
        "value": base,
    })

    num_errors = result.validation_error_count
    num_warnings = result.validation_warning_count
    num_conflicts = len(getattr(result, "conflicts", None) or [])

    if num_errors:
        penalty = min(0.5, num_errors * 0.10)
        factors.append({
            "name": "validation_errors",
            "impact": "negative",
            "description": f"{num_errors} validation error(s); -0.10 each, capped at -0.50.",
            "value": penalty,
        })

    if num_warnings:
        penalty = min(0.3, num_warnings * 0.05)
        factors.append({
            "name": "validation_warnings",
            "impact": "negative",
            "description": f"{num_warnings} validation warning(s); -0.05 each, capped at -0.30.",
            "value": penalty,
        })

    if num_conflicts:
        penalty = min(0.2, num_conflicts * 0.05)
        factors.append({
            "name": "extractor_conflicts",
            "impact": "negative",
            "description": f"{num_conflicts} extractor conflict(s); -0.05 each, capped at -0.20.",
            "value": penalty,
        })

    if num_conflicts == 0 and confidences:
        factors.append({
            "name": "extractor_agreement",
            "impact": "positive",
            "description": "No conflicts between extractors; +0.05 agreement bonus.",
            "value": 0.05,
        })

    return factors


def _collect_extraction_confidences(result: ExtractionResult) -> list[float]:
    """Collect extraction_confidence values from all fields in the record."""
    if result.record is None:
        return []
    confidences = []
    metadata = result.record.metadata
    field_names = [
        "document_id", "state", "district", "tehsil", "village", "year",
        "document_type", "khata_number", "khewat_number", "khatoni_number",
        "mutation_number", "mutation_date", "mutation_details",
    ]
    for f in field_names:
        field = getattr(metadata, f, None)
        if field is not None and field.provenance is not None and field.provenance.extraction_confidence is not None:
            confidences.append(field.provenance.extraction_confidence)
    for parcel in result.record.parcels:
        for attr in [
            "khasra_number", "area_raw", "area_normalized", "area_unit",
            "land_classification", "land_type", "cultivation_status",
            "irrigation_source", "revenue", "remarks",
        ]:
            field = getattr(parcel, attr, None)
            if field is not None and field.provenance is not None and field.provenance.extraction_confidence is not None:
                confidences.append(field.provenance.extraction_confidence)
    for holder in result.record.landholders:
        for attr in ["name", "father_or_husband_name", "caste", "address", "share", "is_cultivator"]:
            field = getattr(holder, attr, None)
            if field is not None and field.provenance is not None and field.provenance.extraction_confidence is not None:
                confidences.append(field.provenance.extraction_confidence)
    return confidences


def _count_errors(result: ExtractionResult) -> int:
    return result.validation_error_count


def _count_warnings(result: ExtractionResult) -> int:
    return result.validation_warning_count
