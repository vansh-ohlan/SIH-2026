"""Unified analysis result schema."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field

from ai_ml.extraction.schema import ExtractionResult


class AnalysisResult(BaseModel):
    """Unified result combining extraction, validation, scoring, anomaly, and explainability.

    This is the top-level AI analysis output. It preserves all underlying
    structured data and makes the pipeline outputs available in one serializable
    object.
    """

    extraction_result: ExtractionResult = Field(
        description="The raw extraction result from the extraction pipeline.",
    )
    confidence_score: Optional[float] = Field(
        default=None,
        description="Overall extraction confidence in [0.0, 1.0].",
    )
    extraction_risk: Optional[str] = Field(
        default=None,
        description="Risk level derived from extraction/validation quality: LOW, MEDIUM, or HIGH.",
    )
    anomaly_features: Optional[list[float]] = Field(
        default=None,
        description="Numeric feature vector used for anomaly detection.",
    )
    anomaly_score: Optional[float] = Field(
        default=None,
        description="Normalized anomaly score in [0.0, 1.0], where higher means more anomalous.",
    )
    anomaly_risk: Optional[str] = Field(
        default=None,
        description="Risk level derived from anomaly detection: LOW, MEDIUM, or HIGH.",
    )
    explainability_evidence: Optional[dict[str, Any]] = Field(
        default=None,
        description="JSON-serializable explainability evidence for audit/UI.",
    )

    model_config = {"use_enum_values": True}
