"""Unified analysis orchestrator.

Combines extraction, validation, confidence, risk, anomaly detection, and
explainability into a single AnalysisResult.
"""

from __future__ import annotations

from typing import Any, Optional

import numpy as np

from ai_ml.analysis.result import AnalysisResult
from ai_ml.anomaly.features import extract_features
from ai_ml.anomaly.isolation_forest import AnomalyModel
from ai_ml.anomaly.scoring import classify_anomaly
from ai_ml.extraction.schema import ExtractionResult
from ai_ml.scoring.confidence import compute_confidence_factors, compute_overall_confidence
from ai_ml.scoring.explainability import build_extraction_evidence
from ai_ml.scoring.risk import compute_risk_factors, compute_risk_level


class Analyzer:
    """Deterministic orchestrator from ExtractionResult to AnalysisResult.

    Reuses existing components without duplicating logic.
    """

    def __init__(
        self,
        anomaly_model: Optional[AnomalyModel] = None,
    ) -> None:
        self._anomaly_model = anomaly_model

    def analyze(self, extraction_result: ExtractionResult) -> AnalysisResult:
        if extraction_result is None:
            raise ValueError("extraction_result must not be None")

        confidence_score = compute_overall_confidence(extraction_result)
        extraction_risk = compute_risk_level(confidence_score, extraction_result)

        anomaly_features = None
        anomaly_score = None
        anomaly_risk = None

        if self._anomaly_model is not None and self._anomaly_model.is_fitted:
            feature_vector = extract_features(extraction_result)
            if feature_vector.ndim == 1:
                feature_vector = feature_vector.reshape(1, -1)
            anomaly_score_array = self._anomaly_model.score(feature_vector)
            anomaly_score = float(anomaly_score_array[0])
            prediction_array = self._anomaly_model.predict(feature_vector)
            anomaly_risk_dict = classify_anomaly(anomaly_score, int(prediction_array[0]))
            anomaly_risk = anomaly_risk_dict["risk_level"]
            anomaly_features = feature_vector.flatten().tolist()

        explainability_evidence = build_extraction_evidence(extraction_result)

        return AnalysisResult(
            extraction_result=extraction_result,
            confidence_score=confidence_score,
            extraction_risk=extraction_risk,
            anomaly_features=anomaly_features,
            anomaly_score=anomaly_score,
            anomaly_risk=anomaly_risk,
            explainability_evidence=explainability_evidence,
        )
