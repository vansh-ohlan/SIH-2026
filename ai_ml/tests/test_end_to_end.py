"""End-to-end AI pipeline tests.

Tests the complete logical flow:
mock document/image -> mock OCR result -> extraction -> validation ->
confidence/risk -> anomaly features/scoring -> explainability -> unified inference result.
"""

from __future__ import annotations

from typing import Any, Optional

import numpy as np
import pytest

from ai_ml.analysis.analyzer import Analyzer
from ai_ml.analysis.result import AnalysisResult
from ai_ml.anomaly.isolation_forest import AnomalyModel
from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
from ai_ml.pipeline.extraction_pipeline import ExtractionPipeline
from ai_ml.extraction.exceptions import InvalidOCRResultError
from ai_ml.extraction.schema import ExtractionMethod
from ai_ml.inference.service import InferenceService


def _make_ocr_result(lines_per_page):
    pages = []
    for page_number in sorted(lines_per_page.keys()):
        blocks = []
        block_lines = []
        for idx, (text, confidence, bbox) in enumerate(lines_per_page[page_number], start=1):
            words = [OCRWord(text=text, confidence=confidence, bbox=bbox, language="hi")]
            block_lines.append(OCRLine(line_id=f"line-{idx}", words=words, bbox=bbox))
        blocks.append(OCRBlock(block_id="block-1", lines=block_lines, bbox=(0, 0, 100, 100)))
        pages.append(OCRPage(page_number=page_number, blocks=blocks, width=100, height=100))
    return OCRResult(pages=pages, engine_name="test", language="hi")


def _make_trained_anomaly_model():
    model = AnomalyModel(contamination=0.2, random_state=42)
    X = np.array([
        [1.0, 0.0, 3.0, 0.0, 0.9, 0.9, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        [2.0, 1.0, 5.0, 1.0, 0.8, 0.85, 1.0, 0.0, 1.0, 1.0, 2.0, 1.0, 0.0],
        [3.0, 2.0, 8.0, 0.0, 0.95, 0.9, 0.0, 0.0, 1.0, 1.0, 3.0, 0.0, 0.0],
        [10.0, 5.0, 20.0, 5.0, 0.3, 0.4, 10.0, 5.0, 0.0, 0.0, 0.0, 5.0, 5.0],
    ])
    model.fit(X)
    return model


class TestEndToEndPipeline:
    def test_clean_normal_ror(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khata Number 123", 0.9, (0, 0, 10, 20)),
                ("Year 2023-24", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        service = InferenceService()
        result = service.infer(ocr)

        assert isinstance(result, AnalysisResult)
        assert result.extraction_result.status == "success"
        assert result.confidence_score is not None
        assert result.confidence_score > 0.5
        assert result.extraction_risk in ("LOW", "MEDIUM")
        assert result.explainability_evidence is not None
        assert result.explainability_evidence["record_present"] is True

    def test_missing_required_field(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year 2023-24", 0.9, (0, 0, 10, 20)),
            ]
        })
        service = InferenceService()
        result = service.infer(ocr)

        assert result.extraction_risk == "HIGH"
        assert result.confidence_score < 1.0
        validation_issues = [
            w for w in result.extraction_result.warnings if "[validation]" in w
        ]
        assert len(validation_issues) > 0

    def test_conflicting_extracted_values(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year of record 2023", 0.9, (0, 0, 10, 20)),
            ]
        })
        service = InferenceService()
        result = service.infer(ocr)

        conflicts = result.extraction_result.conflicts
        year_conflicts = [c for c in conflicts if c["field"] == "year"]
        assert len(year_conflicts) == 1
        values = [v["value"] for v in year_conflicts[0]["values"]]
        assert "2023" in values
        assert "of record 2023" in values
        assert result.confidence_score < 1.0

    def test_low_ocr_confidence(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Revenue 500 INR", 0.3, (0, 0, 10, 20)),
            ]
        })
        service = InferenceService()
        result = service.infer(ocr)

        assert result.confidence_score is not None
        assert result.extraction_risk in ("LOW", "MEDIUM", "HIGH")
        evidence = result.explainability_evidence
        assert evidence is not None
        parcel_revenue = evidence["parcels"][0]["revenue"]
        assert parcel_revenue["ocr_confidence"] == 0.3
        assert parcel_revenue["extraction_confidence"] != 0.3

    def test_multiple_parcels(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 143/1", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 144/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        service = InferenceService()
        result = service.infer(ocr)

        parcels = result.extraction_result.record.parcels
        assert len(parcels) >= 3
        khasra_values = [p.khasra_number.value for p in parcels if p.khasra_number is not None]
        assert "142/1" in khasra_values
        assert "143/1" in khasra_values
        assert "144/1" in khasra_values

    def test_anomalous_record_scores_higher_than_normal(self) -> None:
        model = _make_trained_anomaly_model()

        normal_ocr = _make_ocr_result({
            1: [
                ("Khata Number 123", 0.9, (0, 0, 10, 20)),
                ("Year 2023", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        anomalous_ocr = _make_ocr_result({
            1: [
                ("Revenue ABC", 0.3, (0, 0, 10, 20)),
            ]
        })

        service = InferenceService(
            analyzer=Analyzer(anomaly_model=model)
        )
        normal_result = service.infer(normal_ocr)
        anomalous_result = service.infer(anomalous_ocr)

        assert normal_result.anomaly_score is not None
        assert anomalous_result.anomaly_score is not None
        assert anomalous_result.anomaly_score >= normal_result.anomaly_score
        assert "fraud" not in (anomalous_result.anomaly_risk or "").lower()

    def test_explainability_preserves_provenance(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year 2023-24", 0.9, (0, 0, 10, 20)),
            ],
            2: [
                ("Khasra Number 142/1", 0.85, (5, 5, 15, 25)),
            ],
        })
        service = InferenceService()
        result = service.infer(ocr)

        evidence = result.explainability_evidence
        year_field = evidence["fields"]["year"]
        assert year_field["source_ocr_text"] == "Year 2023-24"
        assert year_field["page_number"] == 1
        assert year_field["source_bbox"] == [0, 0, 10, 20]
        assert year_field["extraction_method"] == ExtractionMethod.LABEL

    def test_explainability_output_is_json_serializable(self) -> None:
        import json
        ocr = _make_ocr_result({
            1: [
                ("Khata Number 123", 0.9, (0, 0, 10, 20)),
            ]
        })
        service = InferenceService()
        result = service.infer(ocr)

        evidence = result.explainability_evidence
        json_str = json.dumps(evidence)
        assert isinstance(json_str, str)
        parsed = json.loads(json_str)
        assert parsed["fields"]["khata_number"]["value"] == "123"

    def test_ocr_failure_raises_clear_error(self) -> None:
        from ai_ml.extraction.exceptions import InvalidOCRResultError
        service = InferenceService()
        with pytest.raises((InvalidOCRResultError, RuntimeError)):
            service.infer(None)

    def test_invalid_input_raises_clear_error(self) -> None:
        service = InferenceService()
        with pytest.raises(InvalidOCRResultError):
            service.infer("not an OCRResult")

    def test_deterministic_end_to_end(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Khata Number 123", 0.9, (0, 0, 10, 20)),
                ("Year 2023", 0.9, (0, 0, 10, 20)),
            ]
        })
        service = InferenceService()
        r1 = service.infer(ocr)
        r2 = service.infer(ocr)
        assert r1.confidence_score == r2.confidence_score
        assert r1.extraction_risk == r2.extraction_risk
        assert r1.anomaly_score == r2.anomaly_score
        assert r1.anomaly_risk == r2.anomaly_risk
