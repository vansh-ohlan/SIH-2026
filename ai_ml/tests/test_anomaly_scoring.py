"""Tests for ai_ml.anomaly.scoring."""

from __future__ import annotations

import pytest

from ai_ml.anomaly.scoring import ANOMALY_THRESHOLDS, classify_anomaly


class TestClassifyAnomaly:
    def test_low_risk_low_score(self) -> None:
        result = classify_anomaly(score=0.2, prediction=1)
        assert result["risk_level"] == "LOW"
        assert result["is_anomalous"] is False
        assert result["anomaly_score"] == 0.2

    def test_medium_risk_medium_score(self) -> None:
        result = classify_anomaly(score=0.6, prediction=1)
        assert result["risk_level"] == "MEDIUM"
        assert result["is_anomalous"] is False
        assert result["anomaly_score"] == 0.6

    def test_high_risk_high_score(self) -> None:
        result = classify_anomaly(score=0.9, prediction=1)
        assert result["risk_level"] == "HIGH"
        assert result["is_anomalous"] is True
        assert result["anomaly_score"] == 0.9

    def test_high_risk_prediction_anomalous(self) -> None:
        result = classify_anomaly(score=0.3, prediction=-1)
        assert result["risk_level"] == "MEDIUM"
        assert result["is_anomalous"] is True

    def test_indicators_returned(self) -> None:
        result = classify_anomaly(score=0.9, prediction=1)
        assert "indicators" in result
        assert isinstance(result["indicators"], list)
        assert len(result["indicators"]) > 0
        assert all("name" in i for i in result["indicators"])

    def test_thresholds_are_documented(self) -> None:
        assert "medium" in ANOMALY_THRESHOLDS
        assert "high" in ANOMALY_THRESHOLDS
        assert 0.0 < ANOMALY_THRESHOLDS["medium"] < ANOMALY_THRESHOLDS["high"] <= 1.0
