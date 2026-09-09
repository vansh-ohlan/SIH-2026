"""Field-level evaluation metrics for extraction quality."""

from __future__ import annotations

from typing import Any, Optional


def _normalize(value: Any) -> str:
    """Conservative normalization for comparison.

    - Strip leading/trailing whitespace.
    - Collapse internal whitespace to single spaces.
    - Do NOT transliterate or aggressively normalize script differences.
    - Do NOT drop meaningful differences such as Devanagari vs Latin digits.
    """
    if value is None:
        return ""
    text = str(value).strip()
    return " ".join(text.split())


def exact_match(predicted: Any, ground_truth: Any) -> bool:
    """Exact match after conservative whitespace normalization."""
    return _normalize(predicted) == _normalize(ground_truth)


def normalize_match(predicted: Any, ground_truth: Any) -> bool:
    """Alias for exact_match.

    We keep a separate name because some consumers may expect both metrics.
    The normalization is intentionally conservative: whitespace only.
    """
    return exact_match(predicted, ground_truth)


def field_accuracy(
    predicted: Any,
    ground_truth: Any,
) -> dict[str, Any]:
    """Compute accuracy metrics for a single field.

    Returns a dict with:
    - exact_match: bool
    - normalized_match: bool
    - predicted_value: raw predicted value (or None)
    - ground_truth_value: raw ground truth value (or None)
    """
    pred_norm = _normalize(predicted)
    gt_norm = _normalize(ground_truth)

    if pred_norm == "" and gt_norm == "":
        return {
            "exact_match": True,
            "normalized_match": True,
            "predicted_value": predicted,
            "ground_truth_value": ground_truth,
            "status": "both_missing",
        }

    if pred_norm == "" and gt_norm != "":
        return {
            "exact_match": False,
            "normalized_match": False,
            "predicted_value": predicted,
            "ground_truth_value": ground_truth,
            "status": "missing_prediction",
        }

    if pred_norm != "" and gt_norm == "":
        return {
            "exact_match": False,
            "normalized_match": False,
            "predicted_value": predicted,
            "ground_truth_value": ground_truth,
            "status": "unexpected_prediction",
        }

    return {
        "exact_match": pred_norm == gt_norm,
        "normalized_match": pred_norm == gt_norm,
        "predicted_value": predicted,
        "ground_truth_value": ground_truth,
        "status": "present",
    }


def compute_coverage(
    predicted_fields: dict[str, Any],
    ground_truth_fields: dict[str, Any],
    evaluated_fields: list[str],
) -> dict[str, Any]:
    """Compute extraction coverage.

    Coverage = fields with non-empty predictions / fields present in ground truth.

    Args:
        predicted_fields: Mapping of field name -> predicted value.
        ground_truth_fields: Mapping of field name -> ground truth value.
        evaluated_fields: Ordered list of fields under evaluation.

    Returns:
        Dict with coverage metrics.
    """
    total_gt = 0
    total_pred = 0

    for field_name in evaluated_fields:
        gt_value = ground_truth_fields.get(field_name)
        pred_value = predicted_fields.get(field_name)

        gt_norm = _normalize(gt_value)
        if gt_norm != "":
            total_gt += 1
            pred_norm = _normalize(pred_value)
            if pred_norm != "":
                total_pred += 1

    coverage = total_pred / total_gt if total_gt > 0 else 1.0

    return {
        "total_ground_truth_fields": total_gt,
        "total_predicted_fields": total_pred,
        "coverage": coverage,
    }
