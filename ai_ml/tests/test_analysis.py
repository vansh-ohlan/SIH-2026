"""Tests for ai_ml.analysis.analyzer."""

from __future__ import annotations

from typing import Any, Optional

import numpy as np
import pytest

from ai_ml.analysis.analyzer import Analyzer
from ai_ml.analysis.result import AnalysisResult
from ai_ml.anomaly.isolation_forest import AnomalyModel
from ai_ml.extraction.schema import (
    ExtractionMethod,
    ExtractedField,
    FieldProvenance,
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.extraction.validator import ExtractionValidator, ValidationIssue, ValidationResult


def _make_extracted_field(value, extraction_confidence=0.9, ocr_confidence=0.9):
    return ExtractedField(
        value=value,
        provenance=FieldProvenance(
            source_ocr_text=str(value),
            source_bbox=(0, 0, 10, 20),
            page_number=1,
            ocr_confidence=ocr_confidence,
            extraction_confidence=extraction_confidence,
            extraction_method=ExtractionMethod.REGEX,
            extractor_version="test",
        ),
    )


def _make_extraction_result(record=None, warnings=None, conflicts=None):
    from ai_ml.extraction.schema import ExtractionResult
    return ExtractionResult(
        record=record,
        status="success",
        warnings=warnings or [],
        extractor_version="test",
        conflicts=conflicts or [],
    )


class TestAnalyzer:
    def test_normal_extraction_produces_analysis_result(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("123")),
            landholders=[],
            parcels=[Parcel(khasra_number=_make_extracted_field("142/1"))],
        )
        extraction_result = _make_extraction_result(record=record)
        analyzer = Analyzer()
        result = analyzer.analyze(extraction_result)
        assert isinstance(result, AnalysisResult)
        assert result.confidence_score is not None
        assert result.extraction_risk in ("LOW", "MEDIUM", "HIGH")
        assert result.explainability_evidence is not None

    def test_validation_errors_decrease_confidence(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1", extraction_confidence=1.0)),
            landholders=[],
            parcels=[],
        )
        warnings = ["[validation] Missing required field 'khata_number': error"]
        extraction_result = _make_extraction_result(
            record=record,
            warnings=warnings,
        )
        extraction_result.validation_error_count = 1
        analyzer = Analyzer()
        result = analyzer.analyze(extraction_result)
        assert result.confidence_score < 1.0
        assert result.extraction_risk == "HIGH"

    def test_conflicts_penalize_confidence(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(year=_make_extracted_field("2023", extraction_confidence=1.0)),
            landholders=[],
            parcels=[],
        )
        conflicts = [{"field": "year", "values": [{"value": "2023"}, {"value": "2024"}]}]
        extraction_result = _make_extraction_result(record=record, conflicts=conflicts)
        analyzer = Analyzer()
        result = analyzer.analyze(extraction_result)
        assert result.confidence_score < 1.0

    def test_missing_fields_handled_safely(self) -> None:
        record = RoRRecord(metadata=RoRMetadata(), landholders=[], parcels=[])
        extraction_result = _make_extraction_result(record=record)
        analyzer = Analyzer()
        result = analyzer.analyze(extraction_result)
        assert result.confidence_score is not None
        assert result.extraction_risk in ("LOW", "MEDIUM", "HIGH")

    def test_anomaly_scoring_with_fitted_model(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1")),
            landholders=[],
            parcels=[Parcel(khasra_number=_make_extracted_field("142/1"))],
        )
        extraction_result = _make_extraction_result(record=record)

        model = AnomalyModel(contamination=0.2, random_state=42)
        X = np.array([
            [1.0, 0.0, 3.0, 0.0, 0.9, 0.9, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0],
            [2.0, 1.0, 5.0, 1.0, 0.8, 0.85, 1.0, 0.0, 1.0, 1.0, 2.0, 1.0, 0.0],
        ])
        model.fit(X)

        analyzer = Analyzer(anomaly_model=model)
        result = analyzer.analyze(extraction_result)
        assert result.anomaly_score is not None
        assert 0.0 <= result.anomaly_score <= 1.0
        assert result.anomaly_risk in ("LOW", "MEDIUM", "HIGH")
        assert result.anomaly_features is not None
        assert len(result.anomaly_features) == 13

    def test_anomaly_none_when_model_not_fitted(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("1")),
            landholders=[],
            parcels=[],
        )
        extraction_result = _make_extraction_result(record=record)
        analyzer = Analyzer(anomaly_model=AnomalyModel(contamination=0.1, random_state=42))
        result = analyzer.analyze(extraction_result)
        assert result.anomaly_score is None
        assert result.anomaly_risk is None
        assert result.anomaly_features is None

    def test_explainability_preserved(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(year=_make_extracted_field("2023-24")),
            landholders=[],
            parcels=[],
        )
        extraction_result = _make_extraction_result(record=record)
        analyzer = Analyzer()
        result = analyzer.analyze(extraction_result)
        evidence = result.explainability_evidence
        assert evidence is not None
        assert evidence["fields"]["year"]["value"] == "2023-24"
        assert evidence["fields"]["year"]["source_ocr_text"] == "2023-24"

    def test_analysis_result_is_json_serializable(self) -> None:
        import json
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("123")),
            landholders=[],
            parcels=[],
        )
        extraction_result = _make_extraction_result(record=record)
        analyzer = Analyzer()
        result = analyzer.analyze(extraction_result)
        json_str = result.model_dump_json()
        assert isinstance(json_str, str)
        parsed = AnalysisResult.model_validate_json(json_str)
        assert parsed.confidence_score is not None

    def test_deterministic_analysis(self) -> None:
        record = RoRRecord(
            metadata=RoRMetadata(khata_number=_make_extracted_field("123")),
            landholders=[],
            parcels=[Parcel(khasra_number=_make_extracted_field("142/1"))],
        )
        extraction_result = _make_extraction_result(record=record)
        analyzer = Analyzer()
        r1 = analyzer.analyze(extraction_result)
        r2 = analyzer.analyze(extraction_result)
        assert r1.confidence_score == r2.confidence_score
        assert r1.extraction_risk == r2.extraction_risk

    def test_none_extraction_result_raises(self) -> None:
        analyzer = Analyzer()
        with pytest.raises(ValueError):
            analyzer.analyze(None)
