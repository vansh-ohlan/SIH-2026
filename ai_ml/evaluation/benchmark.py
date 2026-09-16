"""Real PaddleOCR benchmark runner."""

from __future__ import annotations

import argparse
import json
import logging
import time
from pathlib import Path
from typing import Any, Optional

import numpy as np

from ai_ml.ocr.config import OCRConfig
from ai_ml.ocr.paddle_engine import PaddleOCREngine
from ai_ml.ocr.postprocess import postprocess, PostprocessConfig
from ai_ml.ocr.schema import OCRResult
from ai_ml.ocr.validation import OCRValidationUnavailableError, _check_paddleocr_available
from ai_ml.preprocessing.pipeline import run as run_preprocessing, PreprocessConfig
from ai_ml.inference.document_inference import DocumentAIInference

logger = logging.getLogger(__name__)


class BenchmarkResult:
    """Holds benchmark results for a single image."""

    def __init__(self, image_path: str | Path) -> None:
        self.image_path = str(image_path)
        self.processing_time_seconds: Optional[float] = None
        self.ocr_line_count: Optional[int] = None
        self.ocr_word_count: Optional[int] = None
        self.avg_ocr_confidence: Optional[float] = None
        self.extracted_field_count: Optional[int] = None
        self.extraction_confidence: Optional[float] = None
        self.validation_errors: Optional[int] = None
        self.validation_warnings: Optional[int] = None
        self.extraction_risk: Optional[str] = None
        self.anomaly_score: Optional[float] = None
        self.anomaly_risk: Optional[str] = None
        self.error: Optional[str] = None
        self.analysis_result: Optional[Any] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "image_path": self.image_path,
            "processing_time_seconds": self.processing_time_seconds,
            "ocr_line_count": self.ocr_line_count,
            "ocr_word_count": self.ocr_word_count,
            "avg_ocr_confidence": self.avg_ocr_confidence,
            "extracted_field_count": self.extracted_field_count,
            "extraction_confidence": self.extraction_confidence,
            "validation_errors": self.validation_errors,
            "validation_warnings": self.validation_warnings,
            "extraction_risk": self.extraction_risk,
            "anomaly_score": self.anomaly_score,
            "anomaly_risk": self.anomaly_risk,
            "error": self.error,
        }


def _compute_ocr_stats(ocr_result: OCRResult) -> dict[str, Any]:
    """Compute statistics from an OCR result."""
    total_lines = 0
    total_words = 0
    confidences: list[float] = []

    for page in ocr_result.pages:
        for block in page.blocks:
            for line in block.lines:
                total_lines += 1
                for word in line.words:
                    total_words += 1
                    if word.confidence is not None:
                        confidences.append(word.confidence)

    avg_confidence = sum(confidences) / len(confidences) if confidences else None
    return {
        "ocr_line_count": total_lines,
        "ocr_word_count": total_words,
        "avg_ocr_confidence": avg_confidence,
    }


def _count_extracted_fields(extraction_result: Any) -> int:
    """Count non-empty extracted fields."""
    if not hasattr(extraction_result, "record") or extraction_result.record is None:
        return 0

    record = extraction_result.record
    count = 0

    if hasattr(record, "metadata") and record.metadata is not None:
        for field_name in [
            "document_id", "state", "district", "tehsil", "village",
            "year", "document_type", "khata_number", "khewat_number",
            "khatoni_number", "mutation_number", "mutation_date", "mutation_details"
        ]:
            value = getattr(record.metadata, field_name, None)
            if value is not None and hasattr(value, "value") and value.value is not None:
                count += 1

    if hasattr(record, "parcels"):
        for parcel in record.parcels:
            for field_name in [
                "khasra_number", "area_raw", "area_normalized", "area_unit",
                "land_classification", "land_type", "cultivation_status",
                "irrigation_source", "revenue", "remarks"
            ]:
                value = getattr(parcel, field_name, None)
                if value is not None and hasattr(value, "value") and value.value is not None:
                    count += 1

    if hasattr(record, "landholders"):
        for holder in record.landholders:
            for field_name in [
                "name", "father_or_husband_name", "caste", "address",
                "share", "is_cultivator"
            ]:
                value = getattr(holder, field_name, None)
                if value is not None and hasattr(value, "value") and value.value is not None:
                    count += 1

    return count


def run_benchmark_on_image(
    image_path: str | Path,
    languages: Optional[list[str]] = None,
) -> BenchmarkResult:
    """Run the full AI pipeline on a single local image and collect benchmark stats.

    Args:
        image_path: Path to a local image file.
        languages: OCR language codes. Defaults to ["hi", "en"].

    Returns:
        BenchmarkResult with collected statistics.
    """
    result = BenchmarkResult(image_path)

    if not _check_paddleocr_available():
        result.error = (
            "PaddleOCR is not installed. Install it with: pip install paddleocr. "
            "Note: PaddleOCR downloads models on first use."
        )
        return result

    path = Path(image_path)
    if not path.exists() or not path.is_file():
        result.error = f"Image file does not exist or is not a file: {path}"
        return result

    try:
        preprocessed = run_preprocessing(str(path), config=PreprocessConfig())
    except Exception as exc:
        result.error = f"Preprocessing failed: {exc}"
        return result

    if preprocessed.image is None or not isinstance(preprocessed.image, np.ndarray):
        result.error = "Preprocessing returned an invalid image."
        return result

    try:
        languages = languages or ["hi", "en"]
        ocr_config = OCRConfig(languages=languages)
        ocr_engine = PaddleOCREngine(config=ocr_config)
    except Exception as exc:
        result.error = f"OCR engine initialization failed: {exc}"
        return result

    start_time = time.perf_counter()

    try:
        ocr_result = ocr_engine.recognize(preprocessed.image)
    except Exception as exc:
        result.error = f"OCR failed: {exc}"
        return result

    try:
        ocr_result = postprocess(ocr_result, config=PostprocessConfig())
    except Exception as exc:
        logger.warning("Post-processing failed for %s: %s", path, exc)

    try:
        inference_service = DocumentAIInference(ocr_engine=ocr_engine)
        analysis_result = inference_service.infer(str(path))
    except Exception as exc:
        result.error = f"Inference failed: {exc}"
        return result

    elapsed = time.perf_counter() - start_time
    result.processing_time_seconds = round(elapsed, 4)

    ocr_stats = _compute_ocr_stats(ocr_result)
    result.ocr_line_count = ocr_stats.get("ocr_line_count")
    result.ocr_word_count = ocr_stats.get("ocr_word_count")
    result.avg_ocr_confidence = ocr_stats.get("avg_ocr_confidence")

    result.extracted_field_count = _count_extracted_fields(analysis_result.extraction_result)
    result.extraction_confidence = analysis_result.confidence_score
    result.validation_errors = analysis_result.extraction_result.validation_error_count
    result.validation_warnings = analysis_result.extraction_result.validation_warning_count
    result.extraction_risk = analysis_result.extraction_risk
    result.anomaly_score = analysis_result.anomaly_score
    result.anomaly_risk = analysis_result.anomaly_risk
    result.analysis_result = analysis_result

    return result


def run_benchmark(
    image_paths: list[str | Path],
    languages: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Run benchmark on multiple images.

    Args:
        image_paths: List of local image file paths.
        languages: OCR language codes. Defaults to ["hi", "en"].

    Returns:
        JSON-serializable benchmark report.
    """
    results = []
    for image_path in image_paths:
        try:
            bench_result = run_benchmark_on_image(image_path, languages=languages)
        except Exception as exc:
            bench_result = BenchmarkResult(image_path)
            bench_result.error = f"Unexpected error: {exc}"
        results.append(bench_result.to_dict())

    successful = [r for r in results if r.get("error") is None]
    failed = [r for r in results if r.get("error") is not None]

    def _avg(key: str) -> Optional[float]:
        values = [r[key] for r in successful if r.get(key) is not None]
        return sum(values) / len(values) if values else None

    summary = {
        "evaluation_type": "real_document_benchmark",
        "total_images": len(results),
        "successful": len(successful),
        "failed": len(failed),
        "avg_processing_time_seconds": _avg("processing_time_seconds"),
        "avg_ocr_line_count": _avg("ocr_line_count"),
        "avg_ocr_word_count": _avg("ocr_word_count"),
        "avg_ocr_confidence": _avg("avg_ocr_confidence"),
        "avg_extracted_field_count": _avg("extracted_field_count"),
        "avg_extraction_confidence": _avg("extraction_confidence"),
        "avg_validation_errors": _avg("validation_errors"),
        "avg_validation_warnings": _avg("validation_warnings"),
        "results": results,
    }

    return summary


def main(argv: Optional[list[str]] = None) -> int:
    """CLI entry point for real PaddleOCR benchmark."""
    parser = argparse.ArgumentParser(
        description="Run real PaddleOCR benchmark on local RoR/Jamabandi images."
    )
    parser.add_argument(
        "images",
        nargs="+",
        help="One or more local image file paths.",
    )
    parser.add_argument(
        "--languages",
        default="hi,en",
        help="Comma-separated OCR language codes (default: hi,en).",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional output JSON file path.",
    )
    args = parser.parse_args(argv)

    if not _check_paddleocr_available():
        print(
            "ERROR: PaddleOCR is not installed. Install it with: pip install paddleocr\n"
            "Note: PaddleOCR downloads models on first use. This benchmark is for local use only.",
            file=sys.stderr,
        )
        return 1

    languages = [lang.strip() for lang in args.languages.split(",") if lang.strip()]
    report = run_benchmark(args.images, languages=languages)

    output_text = json.dumps(report, indent=2, default=str)
    if args.output:
        Path(args.output).write_text(output_text, encoding="utf-8")
        print(f"Benchmark report written to: {args.output}")
    else:
        print(output_text)

    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
