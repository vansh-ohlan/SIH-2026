"""Evaluation report generation."""

from __future__ import annotations

import json
from typing import Any, Optional


def generate_report(
    evaluation_result: dict[str, Any],
    title: str = "Extraction Evaluation Report",
) -> dict[str, Any]:
    """Generate a structured evaluation report.

    Args:
        evaluation_result: Raw evaluation metrics from ExtractionEvaluator.
        title: Human-readable report title.

    Returns:
        JSON-serializable report dict.
    """
    field_metrics = evaluation_result.get("field_metrics", {})
    coverage = evaluation_result.get("coverage", {})

    failing_fields = []
    for field_name, metrics in field_metrics.items():
        if not metrics.get("exact_match", False):
            failing_fields.append({
                "field": field_name,
                "predicted": metrics.get("predicted_value"),
                "ground_truth": metrics.get("ground_truth_value"),
                "status": metrics.get("status"),
            })

    return {
        "title": title,
        "overall_accuracy": evaluation_result.get("overall_accuracy"),
        "overall_normalized_match": evaluation_result.get("overall_normalized_match"),
        "coverage": coverage.get("coverage"),
        "total_evaluated": evaluation_result.get("total_evaluated"),
        "exact_match_count": evaluation_result.get("exact_match_count"),
        "normalized_match_count": evaluation_result.get("normalized_match_count"),
        "failing_fields": failing_fields,
        "summary": _build_summary(evaluation_result),
    }


def to_json(report: dict[str, Any], indent: int = 2) -> str:
    """Serialize a report dict to JSON."""
    return json.dumps(report, indent=indent, default=str)


def _build_summary(result: dict[str, Any]) -> str:
    accuracy = result.get("overall_accuracy", 0.0)
    coverage = result.get("coverage", {}).get("coverage", 0.0)
    failing = len([
        m for m in result.get("field_metrics", {}).values()
        if not m.get("exact_match", False)
    ])
    return (
        f"Accuracy: {accuracy:.2%}, Coverage: {coverage:.2%}, "
        f"Failing fields: {failing}"
    )
