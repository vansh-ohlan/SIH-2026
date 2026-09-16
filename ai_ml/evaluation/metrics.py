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


def parcel_level_accuracy(
    predicted_parcels: list[dict[str, Any]],
    ground_truth_parcels: list[dict[str, Any]],
    key_field: str = "khasra_number",
) -> dict[str, Any]:
    """Compute parcel-level accuracy by matching on a key field (default: khasra_number).

    Parcels are matched by their key field value. Unmatched predicted parcels
    count as false positives; unmatched ground-truth parcels count as false negatives.

    Args:
        predicted_parcels: List of predicted parcel dicts.
        ground_truth_parcels: List of ground-truth parcel dicts.
        key_field: Field name to use for matching parcels.

    Returns:
        Dict with parcel-level accuracy metrics.
    """
    pred_by_key: dict[str, dict[str, Any]] = {}
    for parcel in predicted_parcels:
        key = _normalize(parcel.get(key_field))
        if key:
            pred_by_key[key] = parcel

    gt_by_key: dict[str, dict[str, Any]] = {}
    for parcel in ground_truth_parcels:
        key = _normalize(parcel.get(key_field))
        if key:
            gt_by_key[key] = parcel

    matched_keys = set(pred_by_key.keys()) & set(gt_by_key.keys())

    true_positives = 0
    false_positives = 0
    false_negatives = 0

    for key in matched_keys:
        pred_parcel = pred_by_key[key]
        gt_parcel = gt_by_key[key]
        if _parcels_match(pred_parcel, gt_parcel):
            true_positives += 1
        else:
            false_positives += 1
            false_negatives += 1

    false_positives += len(set(pred_by_key.keys()) - matched_keys)
    false_negatives += len(set(gt_by_key.keys()) - matched_keys)

    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 1.0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 1.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "true_positives": true_positives,
        "false_positives": false_positives,
        "false_negatives": false_negatives,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "matched_keys": sorted(matched_keys),
    }


def _parcels_match(pred: dict[str, Any], gt: dict[str, Any]) -> bool:
    """Return True if predicted parcel matches ground truth for evaluated fields."""
    evaluated_fields = ["khasra_number", "area_raw", "land_classification", "irrigation_source", "revenue"]
    for field in evaluated_fields:
        if not exact_match(pred.get(field), gt.get(field)):
            return False
    return True


def landholder_level_accuracy(
    predicted_landholders: list[dict[str, Any]],
    ground_truth_landholders: list[dict[str, Any]],
    key_field: str = "name",
) -> dict[str, Any]:
    """Compute landholder-level accuracy by matching on a key field (default: name).

    Args:
        predicted_landholders: List of predicted landholder dicts.
        ground_truth_landholders: List of ground-truth landholder dicts.
        key_field: Field name to use for matching landholders.

    Returns:
        Dict with landholder-level accuracy metrics.
    """
    pred_by_key: dict[str, dict[str, Any]] = {}
    for holder in predicted_landholders:
        key = _normalize(holder.get(key_field))
        if key:
            pred_by_key[key] = holder

    gt_by_key: dict[str, dict[str, Any]] = {}
    for holder in ground_truth_landholders:
        key = _normalize(holder.get(key_field))
        if key:
            gt_by_key[key] = holder

    matched_keys = set(pred_by_key.keys()) & set(gt_by_key.keys())

    true_positives = 0
    false_positives = 0
    false_negatives = 0

    for key in matched_keys:
        pred_holder = pred_by_key[key]
        gt_holder = gt_by_key[key]
        if _landholders_match(pred_holder, gt_holder):
            true_positives += 1
        else:
            false_positives += 1
            false_negatives += 1

    false_positives += len(set(pred_by_key.keys()) - matched_keys)
    false_negatives += len(set(gt_by_key.keys()) - matched_keys)

    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 1.0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 1.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "true_positives": true_positives,
        "false_positives": false_positives,
        "false_negatives": false_negatives,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "matched_keys": sorted(matched_keys),
    }


def _landholders_match(pred: dict[str, Any], gt: dict[str, Any]) -> bool:
    """Return True if predicted landholder matches ground truth for evaluated fields."""
    evaluated_fields = ["name", "father_or_husband_name", "share"]
    for field in evaluated_fields:
        if not exact_match(pred.get(field), gt.get(field)):
            return False
    return True


def table_row_association_accuracy(
    predicted_parcels: list[dict[str, Any]],
    ground_truth_parcels: list[dict[str, Any]],
    key_field: str = "khasra_number",
) -> dict[str, Any]:
    """Compute table-row association accuracy.

    Measures whether values from the same row in the ground truth are kept
    together in the prediction. A row association is correct if all fields
    for a given key_field value are present in the same predicted parcel.

    Args:
        predicted_parcels: List of predicted parcel dicts.
        ground_truth_parcels: List of ground-truth parcel dicts.
        key_field: Field name used to identify rows/parcels.

    Returns:
        Dict with row-association accuracy metrics.
    """
    gt_by_key: dict[str, dict[str, Any]] = {}
    for parcel in ground_truth_parcels:
        key = _normalize(parcel.get(key_field))
        if key:
            gt_by_key[key] = parcel

    pred_by_key: dict[str, dict[str, Any]] = {}
    for parcel in predicted_parcels:
        key = _normalize(parcel.get(key_field))
        if key:
            pred_by_key[key] = parcel

    matched_keys = set(gt_by_key.keys()) & set(pred_by_key.keys())

    correct_associations = 0
    total_gt_rows = len(gt_by_key)

    for key in matched_keys:
        pred_parcel = pred_by_key[key]
        gt_parcel = gt_by_key[key]
        if _parcels_match(pred_parcel, gt_parcel):
            correct_associations += 1

    association_accuracy = correct_associations / total_gt_rows if total_gt_rows > 0 else 1.0

    return {
        "correct_associations": correct_associations,
        "total_ground_truth_rows": total_gt_rows,
        "association_accuracy": association_accuracy,
        "matched_keys": sorted(matched_keys),
    }
