"""Tests for ai_ml.evaluation.benchmark."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Optional
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from ai_ml.evaluation.benchmark import (
    BenchmarkResult,
    _compute_ocr_stats,
    _count_extracted_fields,
    run_benchmark,
    run_benchmark_on_image,
)
from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
from ai_ml.analysis.result import AnalysisResult
from ai_ml.extraction.schema import (
    ExtractionResult,
    ExtractedField,
    Landholder,
    Parcel,
    RoRMetadata,
    RoRRecord,
)


def _make_ocr_result(**overrides: Any) -> OCRResult:
    word = OCRWord(text="किलो", confidence=0.9, bbox=(0, 0, 10, 20), language="hi")
    line = OCRLine(line_id="line-1", words=[word], bbox=(0, 0, 10, 20))
    block = OCRBlock(block_id="block-1", lines=[line], bbox=(0, 0, 10, 20))
    page = OCRPage(page_number=1, blocks=[block], width=100, height=200)
    data: dict[str, Any] = {
        "pages": [page],
        "engine_name": "mock",
        "language": "hi",
    }
    data.update(overrides)
    return OCRResult(**data)


def _make_analysis_result(**overrides: Any) -> AnalysisResult:
    extraction_result = ExtractionResult(
        record=RoRRecord(
            metadata=RoRMetadata(
                document_id=ExtractedField(value="DOC-1"),
                state=ExtractedField(value="Rajasthan"),
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
        validation_warning_count=1,
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


class TestBenchmarkResult:
    def test_to_dict_contains_expected_keys(self) -> None:
        result = BenchmarkResult("test.png")
        result.processing_time_seconds = 1.5
        result.ocr_line_count = 10
        result.ocr_word_count = 50
        result.avg_ocr_confidence = 0.85
        result.extracted_field_count = 15
        result.extraction_confidence = 0.9
        result.validation_errors = 0
        result.validation_warnings = 1
        result.extraction_risk = "low"
        result.anomaly_score = 0.1
        result.anomaly_risk = "low"

        d = result.to_dict()
        assert d["image_path"] == "test.png"
        assert d["processing_time_seconds"] == 1.5
        assert d["ocr_line_count"] == 10
        assert d["ocr_word_count"] == 50
        assert d["avg_ocr_confidence"] == 0.85
        assert d["extracted_field_count"] == 15
        assert d["extraction_confidence"] == 0.9
        assert d["validation_errors"] == 0
        assert d["validation_warnings"] == 1
        assert d["extraction_risk"] == "low"
        assert d["anomaly_score"] == 0.1
        assert d["anomaly_risk"] == "low"

    def test_to_dict_with_error(self) -> None:
        result = BenchmarkResult("test.png")
        result.error = "something went wrong"
        d = result.to_dict()
        assert d["error"] == "something went wrong"


class TestComputeOCRStats:
    def test_basic_stats(self) -> None:
        result = _make_ocr_result()
        stats = _compute_ocr_stats(result)
        assert stats["ocr_line_count"] == 1
        assert stats["ocr_word_count"] == 1
        assert stats["avg_ocr_confidence"] == pytest.approx(0.9)

    def test_empty_result(self) -> None:
        page = OCRPage(page_number=1, blocks=[], width=100, height=200)
        result = OCRResult(pages=[page], engine_name="mock", language="hi")
        stats = _compute_ocr_stats(result)
        assert stats["ocr_line_count"] == 0
        assert stats["ocr_word_count"] == 0
        assert stats["avg_ocr_confidence"] is None


class TestCountExtractedFields:
    def test_empty_record(self) -> None:
        extraction = ExtractionResult(record=RoRRecord(), status="success")
        assert _count_extracted_fields(extraction) == 0

    def test_with_metadata_and_parcels(self) -> None:
        extraction = _make_analysis_result().extraction_result
        count = _count_extracted_fields(extraction)
        assert count > 0

    def test_none_record(self) -> None:
        extraction = ExtractionResult(record=None, status="success")
        assert _count_extracted_fields(extraction) == 0


class TestRunBenchmark:
    def test_run_benchmark_multiple_images(self, tmp_path: Path) -> None:
        image1 = tmp_path / "img1.png"
        image2 = tmp_path / "img2.png"
        image1.write_bytes(b"fake1")
        image2.write_bytes(b"fake2")

        mock_result = BenchmarkResult("dummy")
        mock_result.processing_time_seconds = 0.5
        mock_result.ocr_line_count = 5
        mock_result.ocr_word_count = 20
        mock_result.avg_ocr_confidence = 0.8
        mock_result.extracted_field_count = 10
        mock_result.extraction_confidence = 0.9
        mock_result.validation_errors = 0
        mock_result.validation_warnings = 1
        mock_result.extraction_risk = "low"
        mock_result.anomaly_score = 0.1
        mock_result.anomaly_risk = "low"

        with patch("ai_ml.evaluation.benchmark.run_benchmark_on_image", return_value=mock_result) as mock_bench:
            report = run_benchmark([str(image1), str(image2)])

        assert report["evaluation_type"] == "real_document_benchmark"
        assert report["total_images"] == 2
        assert report["successful"] == 2
        assert report["failed"] == 0
        assert mock_bench.call_count == 2

    def test_run_benchmark_handles_failures(self, tmp_path: Path) -> None:
        image1 = tmp_path / "img1.png"
        image1.write_bytes(b"fake1")

        mock_result = BenchmarkResult("dummy")
        mock_result.error = "PaddleOCR not installed"

        with patch("ai_ml.evaluation.benchmark.run_benchmark_on_image", return_value=mock_result):
            report = run_benchmark([str(image1)])

        assert report["failed"] == 1
        assert report["successful"] == 0
