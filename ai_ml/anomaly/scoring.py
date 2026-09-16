"""Anomaly score to risk classification and explainable indicators."""

from __future__ import annotations

from typing import Any, Optional

import numpy as np


# Thresholds for anomaly score (in [0, 1] where higher = more anomalous):
# - LOW:    score < 0.5
# - MEDIUM: 0.5 <= score < 0.8
# - HIGH:   score >= 0.8
#
# Rationale:
# IsolationForest decision scores are typically centered around 0 with a
# spread that depends on the data. After normalizing to [0, 1], we use
# conservative thresholds so that only clearly out-of-distribution samples
# are flagged as HIGH. We never label records as "fraud"; we describe them
# as anomalous relative to the training distribution.
ANOMALY_THRESHOLDS = {
    "medium": 0.5,
    "high": 0.8,
}


def classify_anomaly(score: float, prediction: int) -> dict[str, Any]:
    """Classify anomaly score into a risk level with explainable indicators.

    Args:
        score: Normalized anomaly score in [0.0, 1.0].
        prediction: IsolationForest prediction (1 = normal, -1 = anomalous).

    Returns:
        Dict with keys:
        - risk_level: "LOW", "MEDIUM", or "HIGH"
        - anomaly_score: the input score
        - is_anomalous: bool
        - indicators: list of reason dicts
    """
    if prediction == -1:
        is_anomalous = True
    else:
        is_anomalous = score >= ANOMALY_THRESHOLDS["high"]

    if score >= ANOMALY_THRESHOLDS["high"] or (is_anomalous and score >= ANOMALY_THRESHOLDS["medium"]):
        risk_level = "HIGH"
    elif score >= ANOMALY_THRESHOLDS["medium"] or is_anomalous:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    indicators = _build_indicators(score, prediction, risk_level)
    return {
        "risk_level": risk_level,
        "anomaly_score": float(score),
        "is_anomalous": bool(is_anomalous),
        "indicators": indicators,
    }


def _build_indicators(score: float, prediction: int, risk_level: str) -> list[dict[str, Any]]:
    """Build explainable indicators for the anomaly classification."""
    indicators = []
    if prediction == -1:
        indicators.append({
            "name": "isolation_forest_prediction",
            "value": "anomalous",
            "description": "IsolationForest classified this sample as anomalous (-1).",
        })
    else:
        indicators.append({
            "name": "isolation_forest_prediction",
            "value": "normal",
            "description": "IsolationForest classified this sample as normal (1).",
        })

    if score >= ANOMALY_THRESHOLDS["high"]:
        indicators.append({
            "name": "high_anomaly_score",
            "value": score,
            "description": f"Anomaly score {score:.2f} exceeds HIGH threshold ({ANOMALY_THRESHOLDS['high']:.2f}).",
        })
    elif score >= ANOMALY_THRESHOLDS["medium"]:
        indicators.append({
            "name": "medium_anomaly_score",
            "value": score,
            "description": f"Anomaly score {score:.2f} exceeds MEDIUM threshold ({ANOMALY_THRESHOLDS['medium']:.2f}).",
        })
    else:
        indicators.append({
            "name": "low_anomaly_score",
            "value": score,
            "description": f"Anomaly score {score:.2f} is below MEDIUM threshold ({ANOMALY_THRESHOLDS['medium']:.2f}).",
        })

    return indicators
