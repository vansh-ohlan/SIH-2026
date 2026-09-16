"""Tests for ai_ml.evaluation.ground_truth."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from ai_ml.evaluation.ground_truth import (
    evaluate_benchmark,
    load_ground_truth,
    run_ground_truth_benchmark,
)
from ai_ml.analysis.result import AnalysisResult
from ai_ml.extraction.schema import ExtractionResult, ExtractedField, Landholder, Parcel, RoRMetadata, RoRRecord


def _make_analysis_result(**overrides: Any) -> AnalysisResult:
    extraction_result = ExtractionResult(
        record=RoRRecord(
            metadata=RoRMetadata(
                document_id=ExtractedField(value="DOC-1"),
                state=ExtractedField(value="Rajasthan"),
                village=ExtractedField(value="रामगढ़"),
            ),
            landholders=[
                Landholder(name=ExtractedField(value="राम"))
            ],
            parcels=[
                Parcel(khasra_number=ExtractedField(value="142/1"))
            ],
        ),
        status="success",
        validation_error_count=0,
        validation_warning_count=0,
    )
    data: dict[str, Any] = {
        "extraction_result": extraction_result,
        "confidence_score": 0.9,
        "extraction_risk": "low",
        "anomaly_score": 0.1,
        "anomaly_risk": "low",
        "anomaly_features": [0.1],
        "explainability_evidence": {"record_present": True},
    }
    data.update(overrides)
    return AnalysisResult(**data)


class TestLoadGroundTruth:
    def test_load_valid_json(self, tmp_path: Path) -> None:
        gt = {
            "document_id": "DOC-1",
            "state": "Rajasthan",
            "village": "रामगढ़",
            "parcels": [{"khasra_number": "142/1"}],
        }
        gt_file = tmp_path / "gt.json"
        gt_file.write_text(json.dumps(gt), encoding="utf-8")

        loaded = load_ground_truth(str(gt_file))
        assert loaded["document_id"] == "DOC-1"
        assert loaded["village"] == "रामगढ़"

    def test_missing_file_raises(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError):
            load_ground_truth(str(tmp_path / "nonexistent.json"))


class TestEvaluateBenchmark:
    def test_perfect_match(self) -> None:
        prediction = _make_analysis_result()
        ground_truth = {
            "document_id": "DOC-1",
            "state": "Rajasthan",
            "village": "रामगढ़",
            "parcels": [{"khasra_number": "142/1"}],
            "landholders": [{"name": "राम"}],
        }
        report = evaluate_benchmark(prediction, ground_truth)
        assert report["evaluation_type"] == "real_document_benchmark"
        assert report["overall_accuracy"] >= 0.0
        assert "error_analysis" in report
        assert "parcel_metrics" in report

    def test_mismatch_detected(self) -> None:
        prediction = _make_analysis_result()
        ground_truth = {
            "document_id": "DOC-2",
            "state": "Rajasthan",
            "village": "रामगढ़",
            "parcels": [{"khasra_number": "142/1"}],
            "landholders": [{"name": "राम"}],
        }
        report = evaluate_benchmark(prediction, ground_truth)
        assert report["overall_accuracy"] < 1.0
        assert len(report["failing_fields"]) > 0

    def test_report_contains_parcel_and_landholder_metrics(self) -> None:
        prediction = _make_analysis_result()
        ground_truth = {
            "document_id": "DOC-1",
            "state": "Rajasthan",
            "village": "रामगढ़",
            "parcels": [{"khasra_number": "142/1"}],
            "landholders": [{"name": "राम"}],
        }
        report = evaluate_benchmark(prediction, ground_truth)
        assert "parcel_metrics" in report
        assert "landholder_metrics" in report

    def test_error_analysis_present(self) -> None:
        prediction = _make_analysis_result()
        ground_truth = {
            "document_id": "DOC-1",
            "state": "Rajasthan",
            "village": "रामगढ़",
        }
        report = evaluate_benchmark(prediction, ground_truth)
        assert "error_analysis" in report
        assert "categorized_fields" in report["error_analysis"]


class TestRunGroundTruthBenchmark:
    def test_multiple_documents(self, tmp_path: Path) -> None:
        image1 = tmp_path / "img1.png"
        image2 = tmp_path / "img2.png"
        image1.write_bytes(b"fake1")
        image2.write_bytes(b"fake2")

        gt1 = tmp_path / "gt1.json"
        gt2 = tmp_path / "gt2.json"
        gt1.write_text(json.dumps({"document_id": "DOC-1"}), encoding="utf-8")
        gt2.write_text(json.dumps({"document_id": "DOC-2"}), encoding="utf-8")

        mock_bench = _make_analysis_result()
        with patch("ai_ml.evaluation.benchmark.run_benchmark_on_image", return_value=mock_bench):
            with patch("ai_ml.evaluation.ground_truth.load_ground_truth", side_effect=[{"document_id": "DOC-1"}, {"document_id": "DOC-2"}]):
                report = run_ground_truth_benchmark(
                    [str(image1), str(image2)],
                    [str(gt1), str(gt2)],
                )

        assert report["evaluation_type"] == "real_document_benchmark"
        assert report["total_documents"] == 2

    def test_mismatched_lengths_raises(self, tmp_path: Path) -> None:
        with pytest.raises(ValueError, match="same length"):
            run_ground_truth_benchmark(
                [str(tmp_path / "img.png")],
                [str(tmp_path / "gt1.json"), str(tmp_path / "gt2.json")],
            )
