"""Field-level error analysis for extraction evaluation."""

from __future__ import annotations

from typing import Any, Optional


def analyze_field_errors(
    predicted_fields: dict[str, Any],
    ground_truth_fields: dict[str, Any],
) -> dict[str, Any]:
    """Analyze per-field errors between predicted and ground-truth fields.

    Categories:
    - correct: exact match
    - incorrect: present in both but different
    - missing_prediction: present in ground truth but not predicted
    - unexpected_prediction: present in predicted but not in ground truth
    - normalization_mismatch: match after conservative normalization but not exact

    Args:
        predicted_fields: Mapping of field name -> predicted value.
        ground_truth_fields: Mapping of field name -> ground truth value.

    Returns:
        JSON-serializable error analysis report.
    """
    all_fields = sorted(set(ground_truth_fields.keys()) | set(predicted_fields.keys()))

    categorized: dict[str, list[str]] = {
        "correct": [],
        "incorrect": [],
        "missing_prediction": [],
        "unexpected_prediction": [],
        "normalization_mismatch": [],
    }

    per_field: dict[str, dict[str, Any]] = {}

    for field in all_fields:
        pred = predicted_fields.get(field)
        gt = ground_truth_fields.get(field)

        pred_str = _to_str(pred)
        gt_str = _to_str(gt)

        pred_empty = pred_str == ""
        gt_empty = gt_str == ""

        if pred_empty and gt_empty:
            categorized["correct"].append(field)
            per_field[field] = {"status": "both_missing", "predicted": pred, "ground_truth": gt}
        elif pred_empty and not gt_empty:
            categorized["missing_prediction"].append(field)
            per_field[field] = {"status": "missing_prediction", "predicted": pred, "ground_truth": gt}
        elif not pred_empty and gt_empty:
            categorized["unexpected_prediction"].append(field)
            per_field[field] = {"status": "unexpected_prediction", "predicted": pred, "ground_truth": gt}
        elif pred_str == gt_str:
            categorized["correct"].append(field)
            per_field[field] = {"status": "correct", "predicted": pred, "ground_truth": gt}
        elif _normalize(pred) == _normalize(gt):
            categorized["normalization_mismatch"].append(field)
            per_field[field] = {
                "status": "normalization_mismatch",
                "predicted": pred,
                "ground_truth": gt,
                "normalized_predicted": _normalize(pred),
                "normalized_ground_truth": _normalize(gt),
            }
        else:
            categorized["incorrect"].append(field)
            per_field[field] = {"status": "incorrect", "predicted": pred, "ground_truth": gt}

    total = len(all_fields)
    correct = len(categorized["correct"])
    incorrect = len(categorized["incorrect"])
    missing = len(categorized["missing_prediction"])
    unexpected = len(categorized["unexpected_prediction"])
    normalization_only = len(categorized["normalization_mismatch"])

    accuracy = correct / total if total > 0 else 1.0
    coverage = (total - missing) / total if total > 0 else 1.0

    per_field_accuracy = {
        field: {
            "accuracy": 1.0 if field in categorized["correct"] or field in categorized["normalization_mismatch"] else 0.0,
            "status": info["status"],
        }
        for field, info in per_field.items()
    }

    weak_areas = _identify_weak_areas(categorized, per_field)

    return {
        "evaluation_type": "synthetic_evaluation_fixtures",
        "total_fields": total,
        "correct": correct,
        "incorrect": incorrect,
        "missing_prediction": missing,
        "unexpected_prediction": unexpected,
        "normalization_mismatch": normalization_only,
        "accuracy": accuracy,
        "coverage": coverage,
        "per_field_accuracy": per_field_accuracy,
        "categorized_fields": categorized,
        "per_field_details": per_field,
        "weak_areas": weak_areas,
    }


def analyze_parcel_errors(
    predicted_parcels: list[dict[str, Any]],
    ground_truth_parcels: list[dict[str, Any]],
    key_field: str = "khasra_number",
) -> dict[str, Any]:
    """Analyze errors at the parcel level.

    Supports multiple parcels and landholders by matching on a key field.
    """
    pred_by_key = {_normalize(p.get(key_field)): p for p in predicted_parcels if _normalize(p.get(key_field))}
    gt_by_key = {_normalize(p.get(key_field)): p for p in ground_truth_parcels if _normalize(p.get(key_field))}

    matched_keys = set(pred_by_key.keys()) & set(gt_by_key.keys())
    pred_only = set(pred_by_key.keys()) - matched_keys
    gt_only = set(gt_by_key.keys()) - matched_keys

    parcel_errors: dict[str, Any] = {
        "matched": [],
        "missing_prediction": [],
        "unexpected_prediction": [],
        "field_errors": [],
    }

    for key in matched_keys:
        pred_parcel = pred_by_key[key]
        gt_parcel = gt_by_key[key]
        field_level = _compare_nested_fields(pred_parcel, gt_parcel, prefix=key)
        parcel_errors["field_errors"].append(field_level)

    for key in gt_only:
        parcel_errors["missing_prediction"].append({"key_field": key_field, "key_value": key})

    for key in pred_only:
        parcel_errors["unexpected_prediction"].append({"key_field": key_field, "key_value": key})

    return {
        "key_field": key_field,
        "total_predicted": len(predicted_parcels),
        "total_ground_truth": len(ground_truth_parcels),
        "matched_count": len(matched_keys),
        "parcel_errors": parcel_errors,
    }


def analyze_landholder_errors(
    predicted_holders: list[dict[str, Any]],
    ground_truth_holders: list[dict[str, Any]],
    key_field: str = "name",
) -> dict[str, Any]:
    """Analyze errors at the landholder level."""
    pred_by_key = {_normalize(h.get(key_field)): h for h in predicted_holders if _normalize(h.get(key_field))}
    gt_by_key = {_normalize(h.get(key_field)): h for h in ground_truth_holders if _normalize(h.get(key_field))}

    matched_keys = set(pred_by_key.keys()) & set(gt_by_key.keys())

    holder_errors: dict[str, Any] = {
        "matched": [],
        "missing_prediction": [],
        "unexpected_prediction": [],
        "field_errors": [],
    }

    for key in matched_keys:
        pred_holder = pred_by_key[key]
        gt_holder = gt_by_key[key]
        field_level = _compare_nested_fields(pred_holder, gt_holder, prefix=key)
        holder_errors["field_errors"].append(field_level)

    for key in (set(gt_by_key.keys()) - matched_keys):
        holder_errors["missing_prediction"].append({"key_field": key_field, "key_value": key})

    for key in (set(pred_by_key.keys()) - matched_keys):
        holder_errors["unexpected_prediction"].append({"key_field": key_field, "key_value": key})

    return {
        "key_field": key_field,
        "total_predicted": len(predicted_holders),
        "total_ground_truth": len(ground_truth_holders),
        "matched_count": len(matched_keys),
        "holder_errors": holder_errors,
    }


def generate_error_report(
    field_errors: dict[str, Any],
    parcel_errors: Optional[dict[str, Any]] = None,
    landholder_errors: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Generate a JSON-serializable error analysis report.

    Args:
        field_errors: Output from analyze_field_errors.
        parcel_errors: Optional output from analyze_parcel_errors.
        landholder_errors: Optional output from analyze_landholder_errors.

    Returns:
        JSON-serializable report dict.
    """
    report: dict[str, Any] = {
        "evaluation_type": field_errors.get("evaluation_type", "synthetic_evaluation_fixtures"),
        "summary": {
            "total_fields": field_errors.get("total_fields", 0),
            "accuracy": field_errors.get("accuracy", 0.0),
            "coverage": field_errors.get("coverage", 0.0),
            "correct": field_errors.get("correct", 0),
            "incorrect": field_errors.get("incorrect", 0),
            "missing_prediction": field_errors.get("missing_prediction", 0),
            "unexpected_prediction": field_errors.get("unexpected_prediction", 0),
            "normalization_mismatch": field_errors.get("normalization_mismatch", 0),
        },
        "weak_areas": field_errors.get("weak_areas", []),
        "categorized_fields": field_errors.get("categorized_fields", {}),
        "per_field_details": field_errors.get("per_field_details", {}),
    }

    if parcel_errors is not None:
        report["parcel_errors"] = parcel_errors

    if landholder_errors is not None:
        report["landholder_errors"] = landholder_errors

    return report


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _normalize(value: Any) -> str:
    text = _to_str(value)
    return " ".join(text.split())


def _compare_nested_fields(
    predicted: dict[str, Any],
    ground_truth: dict[str, Any],
    prefix: str = "",
) -> dict[str, Any]:
    """Compare nested dict fields and return mismatches."""
    all_keys = sorted(set(ground_truth.keys()) | set(predicted.keys()))
    mismatches = []
    for key in all_keys:
        full_key = f"{prefix}.{key}" if prefix else key
        pred_val = predicted.get(key)
        gt_val = ground_truth.get(key)
        pred_str = _to_str(pred_val)
        gt_str = _to_str(gt_val)
        if pred_str == "" and gt_str == "":
            continue
        if pred_str != gt_str and _normalize(pred_val) != _normalize(gt_val):
            mismatches.append({
                "field": full_key,
                "predicted": pred_val,
                "ground_truth": gt_val,
            })
    return {"key_prefix": prefix, "mismatches": mismatches}


def _identify_weak_areas(
    categorized: dict[str, list[str]],
    per_field: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Identify common weak areas from field error patterns."""
    weak_areas: list[dict[str, Any]] = []

    devanagari_fields = [f for f in categorized.get("incorrect", []) + categorized.get("missing_prediction", []) if "devanagari" in f.lower() or "hindi" in f.lower()]
    if devanagari_fields:
        weak_areas.append({
            "area": "devanagari_digits",
            "affected_fields": devanagari_fields,
            "recommendation": "Review Devanagari numeral OCR and normalization.",
        })

    whitespace_fields = [f for f in categorized.get("normalization_mismatch", []) if "village" in f.lower() or "state" in f.lower() or "year" in f.lower()]
    if whitespace_fields:
        weak_areas.append({
            "area": "ocr_whitespace_corruption",
            "affected_fields": whitespace_fields,
            "recommendation": "Strengthen whitespace collapse in post-processing.",
        })

    table_fields = [f for f in categorized.get("missing_prediction", []) + categorized.get("incorrect", []) if "table" in f.lower() or "parcel" in f.lower()]
    if table_fields:
        weak_areas.append({
            "area": "table_extraction",
            "affected_fields": table_fields,
            "recommendation": "Review table row association and cell extraction logic.",
        })

    missing_table_cells = [f for f in categorized.get("missing_prediction", []) if "area" in f.lower() or "revenue" in f.lower()]
    if missing_table_cells:
        weak_areas.append({
            "area": "missing_table_cells",
            "affected_fields": missing_table_cells,
            "recommendation": "Improve table cell detection for numeric fields.",
        })

    conflicting_fields = [f for f in categorized.get("incorrect", []) if "conflict" in f.lower()]
    if conflicting_fields:
        weak_areas.append({
            "area": "conflicting_values",
            "affected_fields": conflicting_fields,
            "recommendation": "Review conflict resolution logic for duplicate key fields.",
        })

    return weak_areas
