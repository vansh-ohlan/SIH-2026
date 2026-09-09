"""Deterministic risk-level classification for ExtractionResult."""

from __future__ import annotations

from typing import Any, Optional

from ai_ml.extraction.schema import ExtractionResult


# Thresholds and rationale:
# - HIGH:   confidence < 0.40  OR  at least one validation error.
#           Errors indicate missing/invalid required data, which makes the
#           record unreliable regardless of nominal confidence.
# - MEDIUM: confidence >= 0.40 but < 0.80, OR any warning/conflict with no errors.
#           Borderline confidence or quality concerns warrant human review.
# - LOW:    confidence >= 0.80 AND zero errors AND zero conflicts AND zero warnings.
#           Strong confidence with no quality issues; record is usable.
RISK_THRESHOLDS = {
    "low_confidence": 0.80,
    "medium_confidence": 0.40,
}


def compute_risk_level(confidence: float, result: ExtractionResult) -> str:
    """Classify the risk level of an ExtractionResult.

    Args:
        confidence: Overall confidence score in [0.0, 1.0].
        result: ExtractionResult produced by the extraction pipeline.

    Returns:
        One of "LOW", "MEDIUM", or "HIGH".
    """
    num_errors = result.validation_error_count
    num_warnings = result.validation_warning_count
    num_conflicts = len(getattr(result, "conflicts", None) or [])

    if confidence < RISK_THRESHOLDS["medium_confidence"] or num_errors > 0:
        return "HIGH"
    if confidence < RISK_THRESHOLDS["low_confidence"] or num_conflicts > 0 or num_warnings > 0:
        return "MEDIUM"
    return "LOW"


def compute_risk_factors(result: ExtractionResult, confidence: float) -> list[dict[str, Any]]:
    """Return human-readable risk factors.

    Args:
        result: ExtractionResult produced by the extraction pipeline.
        confidence: Overall confidence score in [0.0, 1.0].

    Returns:
        List of factor dicts describing why the risk level was assigned.
    """
    factors = []
    num_errors = result.validation_error_count
    num_warnings = result.validation_warning_count
    num_conflicts = len(getattr(result, "conflicts", None) or [])

    if confidence < RISK_THRESHOLDS["medium_confidence"]:
        factors.append({
            "name": "low_confidence",
            "impact": "negative",
            "description": f"Overall confidence {confidence:.2f} is below the MEDIUM threshold ({RISK_THRESHOLDS['medium_confidence']:.2f}).",
            "value": confidence,
        })
    elif confidence < RISK_THRESHOLDS["low_confidence"]:
        factors.append({
            "name": "medium_confidence",
            "impact": "neutral",
            "description": f"Overall confidence {confidence:.2f} is below the LOW threshold ({RISK_THRESHOLDS['low_confidence']:.2f}).",
            "value": confidence,
        })
    else:
        factors.append({
            "name": "high_confidence",
            "impact": "positive",
            "description": f"Overall confidence {confidence:.2f} meets the LOW threshold ({RISK_THRESHOLDS['low_confidence']:.2f}).",
            "value": confidence,
        })

    if num_errors:
        factors.append({
            "name": "validation_errors",
            "impact": "negative",
            "description": f"{num_errors} validation error(s) force HIGH risk.",
            "value": num_errors,
        })

    if num_warnings:
        factors.append({
            "name": "validation_warnings",
            "impact": "negative",
            "description": f"{num_warnings} validation warning(s) degrade confidence.",
            "value": num_warnings,
        })

    if num_conflicts:
        factors.append({
            "name": "extractor_conflicts",
            "impact": "negative",
            "description": f"{num_conflicts} extractor conflict(s) degrade confidence.",
            "value": num_conflicts,
        })

    return factors


def _count_errors(result: ExtractionResult) -> int:
    return result.validation_error_count


def _count_warnings(result: ExtractionResult) -> int:
    return result.validation_warning_count
