"""Field-level evaluator comparing predicted ExtractionResult against ground truth."""

from __future__ import annotations

from typing import Any, Optional

from ai_ml.evaluation.metrics import (
    compute_coverage,
    exact_match,
    field_accuracy,
    normalize_match,
)


# Core fields evaluated when present. Optional fields are evaluated only
# if they appear in ground truth or prediction.
CORE_FIELDS = [
    "document_id",
    "state",
    "district",
    "tehsil",
    "village",
    "khata_number",
    "khasra_number",
    "landholder_name",
    "area",
]

METADATA_FIELDS = [
    "document_id",
    "state",
    "district",
    "tehsil",
    "village",
    "year",
    "document_type",
    "khata_number",
    "khewat_number",
    "khatoni_number",
    "mutation_number",
    "mutation_date",
    "mutation_details",
]

PARCEL_FIELDS = [
    "khasra_number",
    "area_raw",
    "area_normalized",
    "area_unit",
    "land_classification",
    "land_type",
    "cultivation_status",
    "irrigation_source",
    "revenue",
    "remarks",
]

LANDHOLDER_FIELDS = [
    "name",
    "father_or_husband_name",
    "caste",
    "address",
    "share",
    "is_cultivator",
]


class ExtractionEvaluator:
    """Compare a predicted ExtractionResult against a ground-truth record.

    Ground truth is provided as a dict of structured fields, not as an
    ExtractionResult. This keeps the evaluator decoupled from the internal
    schema while still using the same field names.
    """

    def evaluate(
        self,
        predicted: Any,
        ground_truth: dict[str, Any],
    ) -> dict[str, Any]:
        """Evaluate predicted extraction result against ground truth.

        Args:
            predicted: ExtractionResult from the pipeline, or a dict with a
                ``record`` key containing structured predicted fields.
            ground_truth: Structured dict representing the true record.

        Returns:
            JSON-serializable evaluation report.
        """
        predicted_fields: dict[str, Any] = {}
        field_metrics: dict[str, Any] = {}

        record = _extract_record(predicted)
        if record is not None:
            if hasattr(record, "metadata") and hasattr(record, "parcels"):
                predicted_fields = _extract_fields_from_ror_record(record)
            elif isinstance(record, dict):
                predicted_fields = _flatten_dict(record, prefix="")

        gt_fields: dict[str, Any] = {}
        _flatten_ground_truth(ground_truth, gt_fields, prefix="")

        evaluated_fields = sorted(set(gt_fields.keys()) | set(predicted_fields.keys()))

        exact_matches = 0
        normalized_matches = 0
        total = 0

        for field_name in evaluated_fields:
            pred = predicted_fields.get(field_name)
            gt = gt_fields.get(field_name)
            metrics = field_accuracy(pred, gt)
            field_metrics[field_name] = metrics

            if metrics["status"] == "both_missing":
                continue

            total += 1
            if metrics["exact_match"]:
                exact_matches += 1
            if metrics["normalized_match"]:
                normalized_matches += 1

        coverage = compute_coverage(predicted_fields, gt_fields, evaluated_fields)

        overall_accuracy = exact_matches / total if total > 0 else 1.0
        overall_normalized = normalized_matches / total if total > 0 else 1.0

        return {
            "overall_accuracy": overall_accuracy,
            "overall_normalized_match": overall_normalized,
            "field_metrics": field_metrics,
            "coverage": coverage,
            "exact_match_count": exact_matches,
            "normalized_match_count": normalized_matches,
            "total_evaluated": total,
        }


def _flatten_ground_truth(source: Any, output: dict[str, Any], prefix: str) -> None:
    """Recursively flatten a ground-truth dict/list into dot-notation keys."""
    if isinstance(source, dict):
        for key, value in source.items():
            new_prefix = f"{prefix}.{key}" if prefix else key
            _flatten_ground_truth(value, output, new_prefix)
    elif isinstance(source, list):
        for idx, item in enumerate(source):
            new_prefix = f"{prefix}[{idx}]"
            _flatten_ground_truth(item, output, new_prefix)
    else:
        output[prefix] = source


def _extract_record(predicted: Any) -> Any:
    """Extract the inner record dict or object from a predicted input."""
    if predicted is None:
        return None
    if hasattr(predicted, "record"):
        return predicted.record
    if isinstance(predicted, dict):
        return predicted.get("record", predicted)
    return None


def _extract_fields_from_ror_record(record: Any) -> dict[str, Any]:
    """Extract flat field dict from a RoRRecord-like object."""
    fields: dict[str, Any] = {}

    if hasattr(record, "metadata"):
        metadata = record.metadata
        for f in METADATA_FIELDS:
            extracted = getattr(metadata, f, None)
            fields[f] = extracted.value if extracted is not None else None

    if hasattr(record, "parcels"):
        for idx, parcel in enumerate(record.parcels):
            for f in PARCEL_FIELDS:
                extracted = getattr(parcel, f, None)
                key = f"parcels[{idx}].{f}"
                fields[key] = extracted.value if extracted is not None else None

    if hasattr(record, "landholders"):
        for idx, holder in enumerate(record.landholders):
            for f in LANDHOLDER_FIELDS:
                extracted = getattr(holder, f, None)
                key = f"landholders[{idx}].{f}"
                fields[key] = extracted.value if extracted is not None else None

    return fields


def _flatten_dict(source: Any, prefix: str) -> dict[str, Any]:
    """Flatten a nested dict/list into dot-notation keys."""
    output: dict[str, Any] = {}
    _flatten_ground_truth(source, output, prefix)
    return output
